# CODEBASE_AUDIT.md — ANSAVA Stok / İş Emri Sistemi
> Hedef: Mevcut kod tabanındaki **hataları (compile-time & runtime)**, **frontend↔backend sözleşme uyuşmazlıklarını**, **güvenlik açıklarını** ve **optimizasyon fırsatlarını** tespit edip, kopyala-yapıştır uygulanabilir düzeltmeler sunmak.

Öncelik lejantı: 🔴 kritik (derleme/çalışma kırığı) · 🟠 major (veri/akış hatası) · 🔐 güvenlik · 🟡 minor · ⚡ optimizasyon

---

## 0. Özet Tablosu

| # | Konu | Dosya(lar) | Öncelik |
|---|------|-----------|---------|
| 1 | `Plus` ikonu import edilmemiş (runtime/TS kırığı) | frontend `WorkOrderDetail.tsx` | 🔴 |
| 2 | `productsApi.getCostHistory / getMovements` tanımsız | frontend `api.ts`, `ProductDetail.tsx` | 🔴 |
| 3 | `validateRequest` parse sonucunu `req.body`'ye yazmıyor → `initial_cost` "no such column" çökmesi | backend `validateRequest.ts`, `products.ts` | 🔴 |
| 4 | Sidebar `/stock` yolu yanlış (rota `/stock-movements`) | frontend `Sidebar.tsx` | 🔴 |
| 5 | `role === 'ADMIN'` büyük/küçük harf hatası | frontend `UserList.tsx` | 🔴 |
| 6 | TS imza hataları (`usersApi.list({})`, `stockApi.list({type})`) | frontend `api.ts`, `UserList`, `StockMovements`, `WorkOrderForm` | 🔴 |
| 7 | Açık `/auth/register` + mass-assignment (herkes admin oluşturabilir) | backend `auth.ts` | 🔐 |
| 8 | `PUT /products/:id` ve `PUT /work-orders/:id` whitelist yok | backend `products.ts`, `workOrders.ts` | 🔐 |
| 9 | Alan adı uyuşmazlıkları (movement.type, requested_qty, assigned_to_id, search, product_name…) | birçok dosya | 🟠 |
| 10 | Hata payload şekli tutarsız (`{error: string}` vs `{error:{message}}`) | backend `errorHandler.ts`, frontend toast'lar | 🟠 |
| 11 | 401 interceptor'ı login hatasında da redirect ediyor | frontend `api.ts` | 🟠 |
| 12 | Dashboard summary N+1 sorgu | backend `dashboard.ts` |  |
| 13 | FK kolonlarında index yok | backend migrations | ⚡ |
| 14 | Arama debounce + pagination UI yok | frontend listeler | ⚡/🟡 |
| 15 | order_no yarış durumu (race condition) | backend `workOrders.ts` | 🟡 |
| 16 | "Fazla istenmiyor" iş kuralı uygulanmamış | backend `workOrders.ts` | 🟠 |
| 17 | İşçilik/Ekipman sekmeleri render edilmiyor, ekleme butonları ölü | frontend `WorkOrderDetail.tsx` | 🟠 |
| 18 | Maliyet sekmesi hiç veri almıyor (`order.cost_materials` vb. yok) | frontend `WorkOrderDetail.tsx` | 🟠 |
| 19 | `register` SQLite `.returning()` riski | backend `auth.ts` | 🟡 |
| 20 | Kendini silme/pasifleştirme kilidi yok | backend `users.ts` | 🔐 |
| 21 | JWT/CORS hardcoded | backend `app.ts`, `auth.ts` | 🔐 |
| 22 | Vite `/api` proxy doğrulaması | frontend `vite.config.ts` | 🟡 |

---

## 1. 🔴 KRİTİK HATALAR

### 1.1 `Plus` ikonu import edilmemiş — `WorkOrderDetail.tsx`
JSX'te `<Plus .../>` 3 kez kullanılıyor ama import listesinde yok → TS compile error / runtime `ReferenceError`.

```tsx
// frontend/src/pages/work-orders/WorkOrderDetail.tsx
import { ArrowLeft, Check, X, FileText, Wrench, HardHat, DollarSign, Plus } from 'lucide-react';
```

### 1.2 Tanımsız API metodları — `ProductDetail.tsx`
`productsApi.getCostHistory` ve `productsApi.getMovements` **`api.ts` içinde yok** → sayfa açılınca `TypeError: productsApi.getCostHistory is not a function`.

**Fix A (frontend `api.ts`'e ekle):**
```ts
export const productsApi = {
  // ...mevcutlar
  getCostHistory: (id: string) => api.get<ProductCostHistory[]>(`/products/${id}/costs`).then(r => r.data),
  getMovements: (id: string) => api.get<StockMovement[]>(`/products/${id}/movements`).then(r => r.data),
};
```

**Fix B (backend `routes/products.ts`'e yeni rotalar — `/:id` rotasından SONRA eklenebilir, çakışma yok):**
```ts
router.get('/:id/costs', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await db('product_cost_history')
      .where({ product_id: req.params.id })
      .orderBy('effective_date', 'desc');
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id/movements', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await db('stock_movements')
      .where({ 'stock_movements.product_id': req.params.id })
      .leftJoin('users as creator', 'stock_movements.created_by', 'creator.id')
      .select('stock_movements.*', 'creator.name as creator_name')
      .orderBy('stock_movements.created_at', 'desc');
    res.json(rows);
  } catch (e) { next(e); }
});
```

### 1.3 `validateRequest` parse sonucunu kullanmıyor → ürün oluşturma/düzenleme çöker
Zod bilinmeyen anahtarları **strip** eder; ama route'lar `req.body`'yi ham kullanıyor. Form `initial_cost` gönderdiğinde `INSERT/UPDATE ... initial_cost` → SQLite `no such column` → **tüm ürün create/edit akışı 500 verir**.

```ts
// backend/src/middleware/validateRequest.ts
try {
  req.body = await schema.parseAsync(req.body); // ← parse edilmiş (strip edilmiş) body'yi ata
  next();
} catch (error) { ... }
```

### 1.4 Sidebar stok linki yanlış rota
```tsx
// frontend/src/components/layout/Sidebar.tsx
{ name: 'Stok Hareketleri', path: '/stock-movements', icon: ArrowLeftRight }, // '/stock' → Navigate '/' ye düşüyordu
```

### 1.5 Rol karşılaştırmasında büyük harf — `UserList.tsx`
```tsx
currentUser?.role === 'admin' && ( <Button>... )   // 'ADMIN' asla eşleşmez → buton hiç görünmez
```

### 1.6 TypeScript imza kırıkları
```ts
// api.ts — imzaları parametre kabul edecek şekilde düzelt
usersApi.list = (params?: { limit?: number }) => api.get<User[]>('/users', { params }).then(r => r.data);
stockApi.list = (params?: { movement_type?: string; is_approved?: string; page?: number; limit?: number }) => ...
```
```tsx
// StockMovements.tsx — backend 'movement_type' bekliyor, 'type' değil
queryFn: () => stockApi.list({ movement_type: type !== 'all' ? type : undefined }),
```

---

## 2. 🟠 FRONTEND ↔ BACKEND SÖZLEŞME UYUŞMAZLIKLARI

### 2.1 Dashboard son hareketler
Backend ham satır döner (`movement_type`, `product_id`); frontend `movement.type` ve `movement.product?.name` okuyor → tablo boş.

**Backend (`dashboard.ts` `/recent-movements`):**
```ts
const movements = await db('stock_movements')
  .leftJoin('products', 'stock_movements.product_id', 'products.id')
  .select('stock_movements.*', 'products.name as product_name', 'products.unit as product_unit')
  .orderBy('stock_movements.created_at', 'desc')
  .limit(10);
```
**Frontend (`Dashboard.tsx`):**
```tsx
<TableCell>{movement.product_name ?? '-'}</TableCell>
<TableCell><StatusBadge status={movement.movement_type} type="movement" /></TableCell>
<TableCell className="text-right">{movement.quantity} {movement.product_unit}</TableCell>
```

### 2.2 Stok listesi join'leri eksik
`GET /stock-movements` ürün/kullanıcı adı döndürmüyor.

```ts
// backend/src/routes/stockMovements.ts — GET /
const query = db('stock_movements')
  .leftJoin('products', 'stock_movements.product_id', 'products.id')
  .leftJoin('users as creator', 'stock_movements.created_by', 'creator.id')
  .leftJoin('users as approver', 'stock_movements.approved_by', 'approver.id')
  .select(
    'stock_movements.*',
    'products.name as product_name', 'products.code as product_code', 'products.unit as product_unit',
    'creator.name as creator_name', 'approver.name as approver_name'
  );
if (req.query.movement_type) query.where('stock_movements.movement_type', req.query.movement_type);
if (req.query.is_approved !== undefined) query.where('stock_movements.is_approved', req.query.is_approved === 'true');
const [{ count }] = await query.clone().count('stock_movements.id as count');
const movements = await query.limit(limit).offset(offset).orderBy('stock_movements.created_at', 'desc');
```

### 2.3 İş emri listesi: arama çalışmıyor + atanan UUID görünüyor
Backend `search` paramını yok sayıyor, join yok.

```ts
// backend/src/routes/workOrders.ts — GET /
const query = db('work_orders')
  .leftJoin('users as assignee', 'work_orders.assigned_to', 'assignee.id')
  .leftJoin('users as creator', 'work_orders.created_by', 'creator.id')
  .select('work_orders.*', 'assignee.name as assignee_name', 'creator.name as creator_name')
  .where('work_orders.is_active', true);

if (req.query.search) {
  const s = `%${req.query.search}%`;
  query.where((q) => q.where('order_no', 'like', s).orWhere('title', 'like', s));
}
if (req.query.status) query.where('work_orders.status', req.query.status);
if (req.query.client_type) query.where('work_orders.client_type', req.query.client_type);
const [{ count }] = await query.clone().count('work_orders.id as count');
```
Frontend `WorkOrderList.tsx` zaten `order.assignee_name` deniyor; join sonrası düzelir.

### 2.4 İş emri detayı: malzeme alan adları
Backend `requested_quantity/...` döner ve ürün join'i yok; frontend `requested_qty`, `item.product?.name` okuyor.

**Backend (`GET /:id`):**
```ts
const items = await db('work_order_items')
  .where({ work_order_id: order.id })
  .leftJoin('products', 'work_order_items.product_id', 'products.id')
  .select('work_order_items.*',
    'products.name as product_name', 'products.code as product_code', 'products.unit as product_unit');

const labor = await db('labor_logs')
  .where({ work_order_id: order.id })
  .leftJoin('users', 'labor_logs.user_id', 'users.id')
  .select('labor_logs.*', 'users.name as user_name');
```
**Frontend tablo satırı:**
```tsx
<TableCell>{item.product_name}</TableCell>
<TableCell className="text-right">{item.requested_quantity} {item.product_unit}</TableCell>
<TableCell className="text-right">{item.approved_quantity ?? '-'} {item.product_unit}</TableCell>
<TableCell className="text-right">{item.used_quantity ?? 0} {item.product_unit}</TableCell>
```

### 2.5 `assigned_to_id` vs `assigned_to`
Form `assigned_to_id` gönderiyor, backend şeması `assigned_to` bekliyor → atama sessizce kayboluyor.

```tsx
// WorkOrderForm.tsx
const formSchema = z.object({
  title: z.string().min(1, 'Başlık zorunludur'),
  description: z.string().optional(),
  client_type: z.string().min(1, 'Kurum tipi zorunludur'),
  assigned_to: z.string().uuid().optional(),   // ← isim değişikliği
});
// Select: onValueChange={(val) => setValue('assigned_to', val)}
```

### 2.6 `PaginatedResponse` tipi backend ile uyumsuz
```ts
// frontend/src/lib/types.ts
export interface PaginatedResponse<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; pages: number };
}
```

### 2.7 Hata payload standardizasyonu
`errorHandler` `{ error: { message } }` dönerken route'lar `{ error: 'string' }` dönüyor; Login `setError(object)` → React "Objects are not valid as a React child" crash (500 durumunda).

```ts
// backend/src/middleware/errorHandler.ts
res.status(status).json({ error: message });   // düz string
```
```ts
// frontend/src/lib/utils.ts — ortak hata mesajı çıkarıcı
export const getErrorMessage = (err: any, fallback = 'Bir hata oluştu') => {
  const e = err?.response?.data?.error;
  return typeof e === 'string' ? e : e?.message ?? fallback;
};
```
Tüm `toast.error(err.message ...)` çağrılarını `getErrorMessage(err)` ile değiştir.

### 2.8 401 interceptor login'i de redirect ediyor
```ts
// frontend/src/lib/api.ts
api.interceptors.response.use((res) => res, (error) => {
  const isAuthCall = (error.config?.url ?? '').includes('/auth/');
  if (error.response?.status === 401 && !isAuthCall) {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});
```

### 2.9 `ProductDetail` güncel birim maliyet
Backend `cost_history` (desc) döner; `product.current_unit_cost` diye bir alan yok.
```tsx
const latestCost = product?.cost_history?.[0]?.unit_cost ?? 0;
<p className="font-medium">₺{latestCost.toLocaleString('tr-TR')}</p>
```
Hareketler tablosunda da `mov.type` → `mov.movement_type`, `mov.created_by?.name` → `mov.creator_name` (1.2'deki yeni endpoint ile).

---

## 3. 🔐 GÜVENLİK

### 3.1 Açık register + mass-assignment (EN KRİTİK)
`POST /auth/register` authsuz ve `role: 'admin'` kabul ediyor → **herkes admin olabilir**.

```ts
// backend/src/routes/auth.ts
router.post('/register', authenticate, requireAdmin, validateRequest(registerSchema), async (...) => { ... });
```
(Admin zaten UI'da "Yeni Personel" akışı ekleyecek; açık kayıt kapatılmalı.)

### 3.2 PUT endpoint'lerinde alan whitelist'i
```ts
// backend/src/validation/schemas.ts
export const productUpdateSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  min_stock_level: z.number().min(0).optional(),
});
export const workOrderUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['draft','open','in_progress','completed','cancelled']).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});
```
`products.ts PUT /:id` → `validateRequest(productUpdateSchema)`; `workOrders.ts PUT /:id` → `validateRequest(workOrderUpdateSchema)`.
> Bu aynı zamanda 1.3'teki `initial_cost` column crash'ini de kalıcı çözer. `approval_status` artık PUT ile değiştirilemez → onay akışı bypass edilemez.

### 3.3 Kendi hesabını silme/pasifleştirme
```ts
// backend/src/routes/users.ts (delete & put başına)
if (req.params.id === req.user?.id) {
  res.status(400).json({ error: 'Kendi hesabınızı değiştiremezsiniz' }); return;
}
```

### 3.4 Hardcoded secret / CORS
```ts
// app.ts
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
// auth.ts
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET env gerekli');
```

### 3.5 Login rate-limit (öneri)
```ts
import rateLimit from 'express-rate-limit';
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }));
```

---

## 4. 🟡 BACKEND MANTIK HATALARI

### 4.1 `initial_cost` hiç kaydedilmiyor (ürün oluştururken)
```ts
// backend/src/validation/schemas.ts → productSchema'ya ekle
initial_cost: z.number().min(0).optional(),

// backend/src/routes/products.ts → POST /
const { initial_cost, ...fields } = req.body;
const id = uuidv4();
await db.transaction(async (trx) => {
  await trx('products').insert({ id, ...fields });
  if (typeof initial_cost === 'number' && initial_cost > 0) {
    await trx('product_cost_history').insert({
      id: uuidv4(), product_id: id, unit_cost: initial_cost,
      effective_date: new Date().toISOString().slice(0, 10),
    });
  }
});
```

### 4.2 "Fazla istenmiyor" iş kuralı yok
```ts
// workOrders.ts → PUT /:id/items/:itemId
const item = await db('work_order_items').where({ id: req.params.itemId }).first();
if (!item) { res.status(404).json({ error: 'Kalem bulunamadı' }); return; }
if (req.body.approved_quantity != null && Number(req.body.approved_quantity) > Number(item.requested_quantity)) {
  res.status(400).json({ error: 'Onaylanan miktar talep edilen miktarı aşamaz' }); return;
}
```

### 4.3 Onay durum geçişleri korunmasız
```ts
// workOrders.ts → approve / reject başına
const order = await db('work_orders').where({ id: req.params.id }).first();
if (order?.approval_status !== 'pending') {
  res.status(400).json({ error: 'Bu iş emri zaten sonuçlanmış' }); return;
}
```

### 4.4 `order_no` race condition
Unique constraint çakışmada 500 üretir; retry ekleyin:
```ts
async function createWithOrderNo(body: any, userId: string, tries = 3): Promise<string> {
  for (let i = 0; i < tries; i++) {
    try {
      const id = uuidv4();
      await db('work_orders').insert({ id, order_no: await generateOrderNo(), created_by: userId, ...body });
      return id;
    } catch (e: any) {
      if (i === tries - 1 || !/unique/i.test(e.message)) throw e;
    }
  }
  throw new Error('order_no üretilemedi');
}
```

### 4.5 SQLite `.returning()` riski — `auth.ts register`
Dialect farklarına karşı insert-then-select desenine geçin (diğer route'larla tutarlı):
```ts
await db('users').insert({ id, name, email, password_hash, role, is_authorized_creator });
const user = await db('users').where({ id }).first();
res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
```

### 4.6 Stok onayında iş emri kalemi senkronu (iş kuralı önerisi)
OUT onaylanırken ilgili `work_order_items.used_quantity` güncellenmeli:
```ts
await trx('stock_movements').where({ id: movement.id }).update({ is_approved: true, approved_by: req.user?.id, approved_at: trx.fn.now() });
if (movement.work_order_id) {
  await trx('work_order_items')
    .where({ work_order_id: movement.work_order_id, product_id: movement.product_id })
    .increment('used_quantity', movement.quantity);
}
```

---

## 5. ⚡ PERFORMANS & OPTİMİZASYON

### 5.1 Dashboard summary N+1 → tek sorgu
```ts
// backend/src/routes/dashboard.ts
const [{ total_stock_value }] = await db('products')
  .where({ is_active: true })
  .sum(db.raw(`current_stock * COALESCE((
      SELECT unit_cost FROM product_cost_history pch
      WHERE pch.product_id = products.id
      ORDER BY effective_date DESC LIMIT 1), 0) as total_stock_value`));
```

### 5.2 `reports.workOrderCosts` N+1 → tek sorgu
```ts
const items = await db('work_order_items')
  .where({ work_order_id: req.params.id })
  .leftJoin('product_cost_history as c', function () {
    this.on('c.product_id', 'work_order_items.product_id');
  })
  .select('work_order_items.used_quantity')
  .orderBy('c.effective_date', 'desc'); // grup başına ilk satırı almak yerine aşağıdaki raw daha güvenli:
```
Daha güvenli raw yaklaşım:
```ts
const [{ material_cost }] = await db.raw(`
  SELECT COALESCE(SUM(wi.used_quantity * (
    SELECT unit_cost FROM product_cost_history pch
    WHERE pch.product_id = wi.product_id
    ORDER BY effective_date DESC LIMIT 1)), 0) as material_cost
  FROM work_order_items wi WHERE wi.work_order_id = ?`, [req.params.id]);
```

### 5.3 Index migration'ı (SQLite FK lookup hızı)
```ts
// backend/src/db/migrations/002_add_indexes.ts
import type { Knex } from 'knex';
export async function up(knex: Knex): Promise<void> {
  const add = (table: string, cols: string[]) => knex.schema.alterTable(table, (t) => t.index(cols));
  await add('stock_movements', ['product_id']);
  await add('stock_movements', ['work_order_id']);
  await add('stock_movements', ['is_approved']);
  await add('work_order_items', ['work_order_id']);
  await add('work_order_items', ['product_id']);
  await add('product_cost_history', ['product_id', 'effective_date']);
  await add('labor_logs', ['work_order_id']);
  await add('equipment_logs', ['work_order_id']);
  await add('work_orders', ['status']);
  await add('work_orders', ['client_type']);
}
export async function down(knex: Knex): Promise<void> {
  const drop = (table: string, cols: string[]) => knex.schema.alterTable(table, (t) => t.dropIndex(cols));
  // aynı sırayla drop
}
```

### 5.4 Arama debounce + önceki veriyi koruma
```tsx
// ProductList.tsx / WorkOrderList.tsx
const [searchInput, setSearchInput] = useState('');
const [search, setSearch] = useState('');
useEffect(() => {
  const t = setTimeout(() => setSearch(searchInput), 300);
  return () => clearTimeout(t);
}, [searchInput]);

const { data, isPlaceholderData } = useQuery({
  queryKey: ['products', search],
  queryFn: () => productsApi.list({ search }),
  placeholderData: (prev) => prev,   // arama sırasında tablo titremesin
});
```

### 5.5 Responsive kırığı — `window.innerWidth` reaktif değil
```tsx
// ProductList.tsx (import edilip kullanılmayan hook'u gerçekten kullan)
const isMobile = useMediaQuery('(max-width: 767px)');
```

### 5.6 Vite proxy doğrulaması
`api.ts` `baseURL: '/api'` kullanıyor; dev sunucusu 3001'e proxy'lemezse tüm çağrılar 404:
```ts
// frontend/vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } } },
});
```

---

## 6. 🧩 EKSİK ÖZELLİK / UX

### 6.1 Pagination UI yok (backend 10 kayıt/page döner!)
Listeler yalnızca ilk 10 kaydı gösterir. Basit kontrol:
```tsx
// components/shared/PaginationControls.tsx
export const PaginationControls = ({ pagination, onPageChange }: {
  pagination?: { page: number; pages: number };
  onPageChange: (p: number) => void;
}) => {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>Önceki</Button>
      <span className="text-sm text-muted-foreground">{pagination.page} / {pagination.pages}</span>
      <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => onPageChange(pagination.page + 1)}>Sonraki</Button>
    </div>
  );
};
```
`ProductList`, `WorkOrderList`, `StockMovements`'e `page` state'i + `pagination={data?.pagination}` ekleyin.

### 6.2 İşçilik / Ekipman sekmeleri ölü
`WorkOrderDetail` verileri render etmiyor, butonların handler'ı yok.

```tsx
// Labor sekmesi render (backend join sonrası user_name gelir — bkz 2.4)
<Table>
  <TableHeader><TableRow>
    <TableHead>Personel</TableHead><TableHead>Tarih</TableHead>
    <TableHead className="text-right">Saat</TableHead><TableHead className="text-right">Ücret</TableHead>
  </TableRow></TableHeader>
  <TableBody>
    {order.labor_logs?.map((log: any) => (
      <TableRow key={log.id}>
        <TableCell>{log.user_name ?? '-'}</TableCell>
        <TableCell>{format(new Date(log.date), 'dd MMM yyyy', { locale: tr })}</TableCell>
        <TableCell className="text-right">{log.hours_worked}</TableCell>
        <TableCell className="text-right">₺{Number(log.hourly_rate).toLocaleString('tr-TR')}</TableCell>
      </TableRow>
    ))}
    {!order.labor_logs?.length && <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Kayıt yok</TableCell></TableRow>}
  </TableBody>
</Table>
```
Ekleme butonlarını `workOrdersApi.addLabor / addEquipment`'e bağlayan dialoglar ekleyin (pattern için `StockMovements.tsx`'teki modalı kopyalayabilirsiniz).

### 6.3 Maliyet sekmesi gerçek veriyle
```tsx
const { data: costs } = useQuery({
  queryKey: ['workOrderCosts', id],
  queryFn: () => reportsApi.workOrderCosts(id as string),
  enabled: !!id,
});
// render: costs?.material_cost, costs?.labor_cost, costs?.equipment_cost, costs?.total_cost
```

### 6.4 Etiket çevirileri
- `UserList` rol badge: `USER_ROLES[u.role] ?? u.role`
- `Reports` kurum raporu: `CLIENT_TYPES[row.client_type] ?? row.client_type`

### 6.5 Rol bazlı buton görünürlüğü
`ProductList` "Yeni Ürün" herkese görünüyor ama backend `requireAdmin` → 403 toast. `useAuth()` ile `user?.role === 'admin'` gating ekleyin.

### 6.6 `window.confirm` yerine mevcut `ConfirmDialog`
`components/shared/ConfirmDialog.tsx` hiç kullanılmıyor; `UserList` silme akışına bağlayın.

---

## 7. HIZLI UYGULAMA CHECKLIST (önerilen sıra)

1. [ ] `validateRequest` → `req.body = parsed` (3 kritik crash'i kapatır)
2. [ ] `Plus` import + `api.ts` eksik metodlar + backend `/:id/costs`, `/:id/movements`
3. [ ] Sidebar `/stock-movements`, `UserList 'admin'`, TS imzaları, `movement_type` param
4. [ ] Register'ı `authenticate + requireAdmin` yap; PUT whitelist şemaları
5. [ ] Join'ler: stock list, dashboard recent, work-orders list/detail (items+labor)
6. [ ] Alan adları: `movement_type`, `requested_quantity`, `assigned_to`, `assignee_name`, `creator_name`
7. [ ] `errorHandler` düz string + `getErrorMessage` helper + 401 interceptor istisnası
8. [ ] 002 index migration + dashboard/reports N+1 optimizasyonu
9. [ ] Pagination UI + debounce
10. [ ] İş kuralları: approved ≤ requested, pending→approved/rejected tek yönlü, order_no retry, used_quantity senkronu

> Not: Bu doküman `implementationPlan.md`'deki "Overall Plan" maddeleriyle birebir eşleşir (transaction'lar zaten doğru kullanılmış; soft-delete mevcut). Yukarıdaki fixes, planın Sprint-2/Sprint-3 hedeflerini tamamlar.