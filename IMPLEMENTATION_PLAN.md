# IMPLEMENTATION PLAN v2 — Stok Takip Uygulaması (Consensus Punch List)

> Status: signed off by Qwen3.8, Claude (Sonnet 5), GPT-5.6 Luna. v2 supersedes v1 and folds in all reviewer refinements.
> Repo: `backend/` = Express + knex (better-sqlite3) + zod, TS compiled to `dist/`. `frontend/` = Vite + React + TS + react-query + shadcn-style ui.
> Rules: implement tasks **in order**, one commit per task, minimal diffs, no unrelated refactors, keep Turkish user-facing strings.

---

## Task 0 — Deployment & database sanity (investigate only, no feature code)

- [ ] Read `backend/package.json` (scripts), `backend/Dockerfile`, root `docker-compose.yml`.
- [ ] Determine whether production runs `dist/server.js` or `src`. If `dist`: ensure the image/build runs `npm run build` after the changes below; add the build step if missing.
- [ ] Determine which SQLite file the running container actually opens. Knex targets `backend/data/app.db`. **Do not modify, overwrite, or delete `backend/database.sqlite`**, and do not run migrations against any DB before confirming it is the live target.
- [ ] `ls backend/src/db/migrations/` and record the real latest migration prefix. Task 1 uses the **next** number — do not assume `005`.
- [ ] Report findings in the Task 1 commit message.

## Task 1 — Migration `<next>`: rejection state + labor rate unit

Create `backend/src/db/migrations/<next>_add_rejection_and_labor_rate_unit.ts` (`<next>` from Task 0):

```ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stock_movements', (table) => {
    table.boolean('is_rejected').defaultTo(false);
    table.uuid('rejected_by').nullable().references('id').inTable('users');
    table.timestamp('rejected_at').nullable();
  });
  await knex.schema.alterTable('labor_logs', (table) => {
    table.string('rate_unit').defaultTo('hourly'); // 'hourly' | 'daily'
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stock_movements', (table) => {
    table.dropColumn('is_rejected');
    table.dropColumn('rejected_by');
    table.dropColumn('rejected_at');
  });
  await knex.schema.alterTable('labor_logs', (table) => {
    table.dropColumn('rate_unit');
  });
}
```

Run with the project's existing migration tooling. Update `backend/src/types/index.ts`:
- `StockMovement`: add `is_rejected?: boolean; rejected_by?: string; rejected_at?: string | Date;`
- `LaborLog`: add `rate_unit?: 'hourly' | 'daily';`

## Task 2 — Stock movement rejection (backend)

File `backend/src/routes/stockMovements.ts`:

```ts
router.post('/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const movement = await db('stock_movements').where({ id: req.params.id }).first();
    if (!movement) { res.status(404).json({ error: 'Hareket bulunamadı' }); return; }
    if (movement.is_approved) { res.status(400).json({ error: 'Bu hareket zaten onaylanmış' }); return; }
    if (movement.is_rejected) { res.status(400).json({ error: 'Bu hareket zaten reddedilmiş' }); return; }
    await db('stock_movements').where({ id: movement.id }).update({
      is_rejected: true, rejected_by: req.user?.id, rejected_at: db.fn.now(),
    });
    res.json({ success: true });
  } catch (error) { next(error); }
});
```

- [ ] In `POST /:id/approve`: after the `is_approved` check add `if (movement.is_rejected) → 400 'Reddedilmiş hareket onaylanamaz'`.
- [ ] Rejected movements never affect stock (no math changes).

File `backend/src/routes/dashboard.ts`:
- [ ] `pending_approvals`: add `.where({ is_rejected: false })` to the `is_approved: false` count.

## Task 3 — Close the orphan-movement cap-bypass (backend) — *depends on Task 2*

File `backend/src/routes/workOrders.ts`, `DELETE /:id/items/:itemId`, after the `used_quantity > 0` guard:

```ts
// NOTE: deleting an item while its auto-created OUT movement is still pending would
// leave an orphan that bypasses the cap check at approval time (item lookup returns
// undefined → cap block skipped → stock decrements invisibly). Block until the
// movement is resolved on the Stock page. Rejected movements of deleted items remain
// in history as inert "ghost" rows (is_rejected=true forever, never touch stock) —
// intentional; do not auto-clean without a data-migration decision.
const pendingMov = await db('stock_movements')
  .where({ work_order_id: req.params.id, product_id: item.product_id })
  .where({ is_approved: false })
  .where({ is_rejected: false })
  .first();
if (pendingMov) {
  res.status(400).json({ error: 'Bu kalem için bekleyen stok hareketi var. Önce Stok Hareketleri sayfasından onaylayın veya reddedin.' });
  return;
}
```

Documented behavior: while a pending OUT movement exists for the (order, product) pair, item deletion is blocked; admin resolves it on the Stock page first. Intentional workflow gate.

## Task 4 — Labor daily rate (backend)

- [ ] `backend/src/validation/schemas.ts` → `laborLogSchema`: add `rate_unit: z.enum(['hourly', 'daily']).optional()`.
- [ ] Add a comment at the schema: **semantics** — `hours_worked` = quantity (hours OR days), `hourly_rate` = unit price (per hour OR per day); cost math stays `quantity × rate`. Column names intentionally reused (accepted MVP naming trade-off; human sign-off required, see checklist).
- [ ] No cost-math changes anywhere (`reports.ts` unchanged).

## Task 5 — Frontend

- [ ] `lib/api.ts`: `stockApi.reject` mirroring `approve`.
- [ ] `lib/types.ts`: mirror Task 1 type additions.
- [ ] `pages/stock/StockMovements.tsx`: approval badge = `m.is_approved ? 'approved' : m.is_rejected ? 'rejected' : 'pending'`; show **Onayla** + **Reddet** only when `!m.is_approved && !m.is_rejected`; `handleReject` mirrors `handleApprove` (same invalidations, toast `'Hareket reddedildi'`).
- [ ] `pages/work-orders/WorkOrderDetail.tsx` → `AddLaborDialog`: Saatlik/Günlük select (`rate_unit`, default hourly); labels switch (`Saat`/`Gün`, `₺ / Saat`/`₺ / Gün`); send `rate_unit`. Labor table unit suffix: `{log.rate_unit === 'daily' ? 'gün' : 'sa'}`.

## Task 6 — OPTIONAL: critical-stock webhook (no telephony, no SMS providers)

- [ ] `backend/src/services/notify.ts`: if `process.env.CRITICAL_STOCK_WEBHOOK_URL` set, POST `{ type:'critical_stock', count, items, at }`; swallow errors with `console.error`.
- [ ] `server.ts` cron calls it after the existing check; keep `console.warn`.

## Task 7 — OPTIONAL, confirm with product owner FIRST: product code regex

- [ ] If confirmed: `productSchema`/`productUpdateSchema` `code` regex `^[A-Z]{2,5}-\d{3}$`, message `'Kod formatı: ABC-000'`. Otherwise skip.

---

## DO NOT IMPLEMENT (pending note-author clarification)

- Purchase-order lifecycle / sales ("mal alım/satım") module
- Any "~100 m" volume threshold rule
- Structured "80V+400" categorization (free text stays)
- SMS/phone telephony integration
- Multi-tier approval hierarchy

## Acceptance checklist

1. Task 0 findings recorded (prod build, live DB file, real migration number).
2. **Human sign-off:** reusing `hours_worked`/`hourly_rate` as generic quantity/unit-price with a `rate_unit` label is an accepted naming trade-off.
3. Reject flow: create OUT → Reddet → badge "Reddedildi", sidebar pending badge decrements; approving it afterwards → 400.
4. **End-to-end orphan test:** approve material item (auto pending OUT) → delete item → expect 400 → reject the OUT on Stock page → delete item succeeds → verify **no stock change and no used_quantity change anywhere**.
5. Re-add the same product afterwards: allowed; the old rejected movement stays as an inert ghost row and does not affect the new item's approval/cap.
6. Labor daily: add a Günlük log → cost tab = quantity × rate; pre-existing hourly rows unchanged.
7. `npm run build` succeeds; deployed build answers `/api/equipment` and `/api/stock-movements/:id/reject`.
8. (If Task 6) webhook listener receives the POST.

---

## Addendum: Implementation Patches (v2.1)

> **Instruction to Agent:** The following patches address specific type definitions and API capabilities identified during codebase review. Implement these *immediately after* the main Task 5 changes to ensure the frontend builds without TypeScript errors and the API supports future filtering.

### Patch 1: Update `workOrdersApi.addLabor` Signature
**File:** `frontend/src/lib/api.ts`
**Action:** Update the `addLabor` method signature in the `workOrdersApi` object to include the new `rate_unit` field.
```typescript
// BEFORE:
addLabor: (id: string, data: { user_id: string; hours_worked: number; hourly_rate: number; date: string; notes?: string }) => ...

// AFTER:
addLabor: (id: string, data: { user_id: string; hours_worked: number; hourly_rate: number; date: string; notes?: string; rate_unit?: 'hourly' | 'daily' }) => ...
```

### Patch 2: Mirror Types in Frontend
**File:** `frontend/src/lib/types.ts`
**Action:** Update the `StockMovement` and `LaborLog` interfaces to match the backend changes from Task 1.
```typescript
export interface StockMovement {
  // ... existing fields ...
  is_rejected?: boolean;
  rejected_by?: string;
  rejected_at?: string | Date;
}

export interface LaborLog {
  // ... existing fields ...
  rate_unit?: 'hourly' | 'daily';
}
```

### Patch 3: Add `is_rejected` Filter to Stock Movements API
**File:** `backend/src/routes/stockMovements.ts`
**Action:** In the `GET /` route handler, add support for filtering by rejection status. This ensures that if the UI later adds a "Pending" tab, it can correctly exclude rejected items.
```typescript
// Inside router.get('/', ...):
if (req.query.is_approved !== undefined) query.where('stock_movements.is_approved', req.query.is_approved === 'true');
// ADD THIS LINE:
if (req.query.is_rejected !== undefined) query.where('stock_movements.is_rejected', req.query.is_rejected === 'true');
```
