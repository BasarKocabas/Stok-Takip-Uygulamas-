# ANSAVA Stok/İş Emri Sistemi — Tespit Edilen Sorunlar ve Çözüm Planı (v3)

Bu doküman, sistemde tespit edilen sorunların kök nedenini ve çözüm tasarımını içerir. Amaç, doğrudan uygulanabilir bir yol haritası çıkarmak.

> **v3 notu:** Bu sürüm, dört bağımsız incelemenin (Qwen: kod satırı doğrulama, GPT: mimari/iş mantığı, Claude: plan yazarı + tutarlılık, Gemini: ilk taslak) çapraz kontrolüyle kilitlendi. v2'den farkları:
> 1. **Sorun 1:** "Override bloğunu sil" adımı grep teyidi sonucuyla revize edildi — blok rozet dışı UI'ı da beslediği için silme **ertelendi**, koşulları aşağıda.
> 2. **Sorun 4:** Cap mantığı her iki yazma yolunda tutarlı hale getirildi (`approved ?? requested`; defansif PUT'te `req.body.approved_quantity` önceliği).
> 3. **Sorun 2:** İade (PUT) ve silme (DELETE) akışları aynı state-transition kuralına bağlandı (çoklu açık atama); çift iadeye kontrollü 400 eklendi.
> 4. **Küçük paket** (yıllık preset, `external_ref`, stok girişi izlenebilirlik) resmen kapsama alındı.

## Özet

| # | Sorun | Kök Neden | Efor |
|---|---|---|---|
| 1 | Koyu temada durum rozetleri okunmuyor | `constants.ts` + 3 sayfada elle yazılmış rozetler; `index.css`'teki layer'sız override listesi eksik ama rozet dışı UI'ı da besliyor | Düşük |
| 4 | "Kullanılan miktar" üst sınırı kontrol edilmiyor | `PUT /work-orders/:id/items/:itemId` ve stok onay akışı, `used` tarafını hiç sınırlamıyor | Düşük |
| 3 | Ürün maliyeti güncellenmiyor | Backend endpoint'i var ama frontend'de çağıran hiçbir arayüz yok | Orta |
| — | Küçük paket (yıllık preset, `external_ref`, stok izlenebilirlik) | 3 ayrı küçük UX/veri boşluğu, notla ilişkili | Düşük-Orta |
| 2 | Ekipman kiralama çok yüzeysel | Ekipman bir "katalog/envanter" değil, serbest metinli tek satırlık maliyet kaydı | Yüksek |

Önerilen uygulama sırası: **1 → 4 → 3 → küçük paket → 2** (en hızlı/en görünür kazanımlardan başlayıp en büyük işe doğru).

---

## Sorun 1: Koyu Temada Durum Rozetleri Görünmüyor

### Kök Neden

**a) Sorun sadece `constants.ts` ile sınırlı değil.** `StockMovements.tsx`, `WorkOrderDetail.tsx` ve `Reports.tsx` içinde `constants.ts`'e hiç uğramayan, elle yazılmış rozet span'leri var (`bg-green-100 text-green-800`, `bg-amber-100 text-amber-800`, `bg-blue-100 text-blue-800`). Bunlar merkezi `StatusBadge` bileşenini kullanmıyor.

**b) CSS Cascade Layer çakışması.** `index.css`'te `@import "tailwindcss"` ile gelen utility sınıfları bir CSS layer'ı içinde; dosyanın altındaki `.dark .bg-green-100 {...}` gibi "SABİT KOYU TEMA" kuralları **layer dışında**. Layer'sız kural, specificity/sıraya bakılmaksızın layer'lı utility'yi her zaman yener. Sonuç: `constants.ts`'e sadece `dark:` varyantı eklemek, override listesindeki renklerde görsel olarak hiçbir şeyi değiştirmez (elle kural kazanır); görünür etki sadece listede hiç olmayan renklerde (violet, gray-800) olur.

**c) Asıl okunabilirlik hatası:** mevcut override listesi sadece `text-*-600/700` tonlarını kapsıyor; rozetlerin kullandığı `-800` tonu (`text-green-800`, `text-violet-800`, `text-gray-800`) hiç kapsanmıyor → koyu arka plan/tint üstünde koyu yazı.

### Doğru Sıra

1. **Önce merkezileştir:** `StockMovements.tsx`, `WorkOrderDetail.tsx`, `Reports.tsx` içindeki elle span'leri kaldırıp `StatusBadge` kullan:
   - `StockMovements.tsx` (Onay sütunu): `<StatusBadge status={m.is_approved ? 'approved' : 'pending'} type="approval" />`
   - `WorkOrderDetail.tsx` (Malzemeler tablosu): `<StatusBadge status={isApproved ? 'approved' : 'pending'} type="approval" />`
   - `Reports.tsx` (Hareket Tipi sütunu): `<StatusBadge status={row.movement_type} type="movement" />` + `StatusBadge` import'u.
   - `ProductList.tsx` / `UserList.tsx` Aktif-Pasif rozetlerine de `dark:` varyantı ekle:
     - Aktif: `bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300`
     - Pasif: `dark:bg-white/10 dark:text-slate-200` (UserList Pasif: `text-gray-500 bg-gray-50 dark:bg-white/10 dark:text-slate-200`)
2. **Sonra `dark:` varyantlarını ekle:** `constants.ts`'teki 3 status objesi ve `StatusBadge.tsx` fallback'i:

```ts
export const WORK_ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Taslak', color: 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-slate-200' },
  open: { label: 'Açık', color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  in_progress: { label: 'Devam Ediyor', color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' },
  cancelled: { label: 'İptal', color: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' },
};
export const APPROVAL_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Beklemede', color: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300' },
  approved: { label: 'Onaylandı', color: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' },
};
export const MOVEMENT_TYPES: Record<string, { label: string; color: string }> = {
  IN: { label: 'Giriş', color: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' },
  OUT: { label: 'Çıkış', color: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' },
};
// StatusBadge.tsx fallback:
let colorClass = 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-slate-200';
```

3. **Grep teyidi ve override bloğu kararı:** `/* durum rozetleri için koyu tint'ler */` bloğunu silmeden önce grep yapıldı ve sonuç **TEMİZ DEĞİL** — blok içindeki kurallar rozet dışı UI'ı da besliyor:
   - `.dark .bg-blue-100` → `Header.tsx` avatar chip'i
   - `.dark .text-red-600/700` → Dashboard kritik stok rakamları, `ProductList.tsx` kritik stok
   - `.dark .text-amber-600` → `StockMovements.tsx` "stok aşımı" uyarı yazısı
   - `.dark .text-blue-600/700` → Dashboard "Tümünü Gör" linki, avatar `text-blue-700`
   - `.dark .text-emerald-600` → Dashboard "+miktar" yazısı
   - `.dark .border-red-200/300` → Dashboard kritik kart çerçevesi

   **Karar (v3 revizyonu):** Blok bu PR'da **SİLİNMEZ**. Okunabilirlik hatası zaten kaynağında çözülüyor (yeni `dark:text-*` sınıfları mevcut elle kurallarla aynı class adı üzerine binmiyor; `bg-*-100` tint'lerinde elle kural kazansa da ürettiği görünüm `dark:` varyantıyla aynı ailede). Blok silme adımı **ayrı bir kozmetik temizlik PR'ına** ötelenir; koşulu: yukarıdaki 6 kullanıma önce `dark:` varyantı eklenir, sonra blok tamamen silinir. `bg-white`, `bg-slate-50`, `bg-gray-100`, `text-slate-*` gibi yapısal kurallar her koşulda kalır.

### Kozmetik hizalama notları (kayıp değil, standartlaşma)
- `WorkOrderDetail`'daki "Onay Bekliyor" etiketi merkezi "Beklemede"ye döner.
- `Reports`'taki Çıkış rozeti maviden kırmızıya döner (`MOVEMENT_TYPES` standardı; `StockMovements`/`ProductDetail` ile aynı dil).

---

## Sorun 4: "Kullanılan Miktar" İçin Üst Sınır Kontrolü Yok

### Kök Neden (iki yazma yolu var)

**Yol A — `PUT /work-orders/:id/items/:itemId`:** `workOrderItemUpdateSchema` `used_quantity`'yi opsiyonel kabul ediyor; `approved ≤ requested` kontrolü var ama `used` için hiçbir sınır yok.

**Yol B — stok çıkışı onayı (asıl kullanılan yol, daha kritik):** `stockMovements.ts` `POST /:id/approve`, OUT hareketi onaylanınca kalemi doğrudan `increment('used_quantity', ...)` ile artırıyor. Aynı iş emrine aynı ürün için birden fazla manuel OUT hareketi bağlanabildiğinden, her onayda toplam birikimli artıyor ve hiçbir yerde `approved`'u aşıp aşmadığı kontrol edilmiyor.

### Çözüm — her iki yola da kontrol

**1) Asıl düzeltme — `stockMovements.ts` onay handler'ı:**

```ts
if (movement.movement_type === 'OUT') {
  if (product.current_stock < movement.quantity) {
    throw new Error('Yetersiz stok');
  }
  if (movement.work_order_id) {
    const item = await trx('work_order_items')
      .where({ work_order_id: movement.work_order_id, product_id: movement.product_id })
      .first();
    if (item) {
      const cap = item.approved_quantity ?? item.requested_quantity;
      const newUsed = Number(item.used_quantity) + Number(movement.quantity);
      if (newUsed > Number(cap)) {
        throw new Error('Onaylanan miktar aşılıyor');
      }
    }
  }
  await trx('products').where({ id: movement.product_id }).decrement('current_stock', movement.quantity);
  if (movement.work_order_id) {
    await trx('work_order_items')
      .where({ work_order_id: movement.work_order_id, product_id: movement.product_id })
      .increment('used_quantity', movement.quantity);
  }
}
```

> **Not (Qwen):** `cap = approved ?? requested` her durumda üst sınır uygular; sadece `approved != null` iken çalışsaydı, madde onayı beklerken manuel bağlanmış OUT onayında kontrol tamamen atlanırdı.

Catch bloğuna dal:

```ts
} else if (error.message === 'Onaylanan miktar aşılıyor') {
  res.status(400).json({ error: 'Bu hareket onaylanırsa kullanılan miktar, onaylanan miktarı aşacak. İşlem reddedildi.' });
}
```

**2) Aynı üründen ikinci kalem satırını baştan engelle:** `POST /:id/items` handler'ına:

```ts
const existing = await db('work_order_items')
  .where({ work_order_id: req.params.id, product_id: req.body.product_id })
  .first();
if (existing) {
  res.status(400).json({ error: 'Bu üründen zaten bir talep satırı var, miktarı düzenleyin' });
  return;
}
```

(Gerekçe: kontrol `.first()` ile tek satır okur ama `.increment()` eşleşen tüm satırı vurur; duplicate varsa kontrol delinir.)

**3) Defansif — `workOrders.ts` item PUT handler'ı:**

```ts
if (req.body.used_quantity != null) {
  const cap = req.body.approved_quantity ?? item.approved_quantity ?? item.requested_quantity;
  if (Number(req.body.used_quantity) > Number(cap)) {
    res.status(400).json({ error: 'Kullanılan miktar onaylanan (veya talep edilen) miktarı aşamaz' });
    return;
  }
}
```

> **Not (Qwen):** Cap, aynı istekte gönderilen yeni `approved_quantity`'den okunmalı; yoksa used, aynı anda düşürülen yeni onayı aşabilir.

**Kabul edilebilir sınır:** Onay akışında o ürüne ait kalem satırı yoksa (`item` null) kontrol sessizce atlanır — kasıtlı ve makul. Küçük paketle stok formuna iş emri select'i gelince, admin onay ekranına opsiyonel "bu iş emrinde bu ürün için talep satırı yok" ipucu eklenebilir (zorunlu değil).

---

## Sorun 3: Ürün Maliyeti Güncellenmiyor

### Kök Neden
`POST /products/:id/cost` ve `productsApi.addCost()` çalışır durumda ama çağıran buton/form yok. `ProductForm.tsx`'teki `initial_cost` sadece oluştururken gösteriliyor.

### Çözüm

**1) Yeni maliyet kaydı ekleme:** `ProductDetail.tsx`'e admin-only "Yeni Maliyet Ekle" butonu + dialog (`unit_cost`, `effective_date`, `notes`) — mevcut `productsApi.addCost()` çağrılır.

**2) Son kaydı düzenleme (yeni endpoint):** `PUT /products/:id/costs/:costId` — iş kuralı: sadece en güncel kayıt düzenlenebilir (denetim izi korunur); `created_at` tiebreaker'lı:

```ts
router.put('/:id/costs/:costId', requireAdmin, validateRequest(productCostSchema), async (req, res, next) => {
  const latest = await db('product_cost_history')
    .where({ product_id: req.params.id })
    .orderBy('effective_date', 'desc')
    .orderBy('created_at', 'desc')
    .first();
  if (!latest || latest.id !== req.params.costId) {
    return res.status(400).json({ error: 'Sadece en güncel maliyet kaydı düzenlenebilir' });
  }
  await db('product_cost_history').where({ id: req.params.costId }).update(req.body);
  res.json({ success: true });
});
```

**Frontend:** Maliyet geçmişi tablosunda sadece ilk satıra admin için düzenle (kalem) ikonu; form mevcut değerlerle açılır, `PUT` ile günceller.

**Cache invalidation (hem ekleme hem düzenlemede hepsi):**

```ts
queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
queryClient.invalidateQueries({ queryKey: ['product', id] });
queryClient.invalidateQueries({ queryKey: ['productCostHistory', id] });
```

---

## Küçük Paket (Sorun 3 ile 2 arasında)

### 1. Raporlar'da "Yıllık" preset
`Reports.tsx`'te Aylık'ın yanına: `<Button variant="outline" size="sm" onClick={() => preset(365)}>Yıllık</Button>`. (İstenirse Sorun 1 PR'ına iliştirilebilir.)

### 2. `external_ref` — kurum talep/referans numarası
- Migration: `work_orders`'a `table.string('external_ref').nullable()`
- `workOrderSchema` / `workOrderUpdateSchema`: `external_ref: z.string().max(100).optional()`
- `WorkOrderForm.tsx`: opsiyonel "Kurum Talep / Referans No" input'u
- `WorkOrderList.tsx`: `order_no` altında mono alt satır; `WorkOrderDetail.tsx`: detay kartına satır
- `types.ts` (frontend + backend): `external_ref?: string`

### 3. Stok girişine iş emri / tedarikçi / irsaliye izlenebilirliği
- Aynı migration'da: `stock_movements`'a `table.string('supplier_name').nullable()` + `table.string('invoice_no').nullable()`
- `stockMovementSchema`'ya ikisi opsiyonel
- `StockMovements.tsx` dialogu: zaten çekilen `workOrders-mini` ile opsiyonel "İş Emri" Select'i (IN/OUT fark etmez); tip IN iken "Tedarikçi" + "İrsaliye/Fatura No" input'ları
- Tabloda not sütununun altında alt satır; `api.ts` create imzası + `types.ts` güncellenir

---

## Sorun 2: Ekipman Kiralama Modülü Yetersiz

### Mevcut sorunlar
Serbest metin `equipment_type` (envanter yok), tek `date` (süre yok), müsaitlik bilinmiyor, tedarikçi yok, sahiplik ayrımı yok, fiyat birimi yok.

### Mimari Not: Üç Ayrı Kavram
1. **Ekipmanın kendisi** (`equipment`) — sabit fiziksel/idari bilgiler.
2. **Bu kiralamanın şartları** (kimden, hangi fiyattan, hangi birimden) — her atamaya özel → `equipment_assignments`.
3. **İş emrine tahsis** — zaten `equipment_assignments`.

Katalogdaki tedarikçi/fiyat alanları sadece **varsayılan/öneri**; gerçek değer her zaman atama satırında (aynı ekipman farklı zamanlarda farklı tedarikçi/fiyatla kiralanabilir; katalogda tutulursa geçmiş üzerine yazılır).

#### `equipment` (katalog)

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | |
| name | string | Örn: "Ekskavatör CAT 320-01" |
| equipment_type | string | Kategori |
| ownership | enum: owned \| rented | Kendi malı mı kiralık mı |
| status | enum: available \| in_use \| maintenance | Müsaitlik |
| specs | text (nullable) | |
| serial_or_plate_no | string (nullable) | |
| default_supplier_name | string (nullable) | Form otomatik doldurma önerisi |
| default_rate_unit | enum: hourly \| daily \| fixed (nullable) | fixed = tek kalem sabit sözleşme bedeli |
| default_rate_cost | decimal (nullable) | Varsayılan birim fiyat |
| is_active | boolean | |
| created_at, updated_at | timestamp | |

#### `equipment_assignments` (asıl kiralama/kullanım kaydı)

| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid | |
| equipment_id | uuid → equipment.id | |
| work_order_id | uuid → work_orders.id | |
| start_date | date | |
| end_date | date (nullable) | NULL = hâlâ kullanımda |
| supplier_name | string (nullable) | Bu atamaya özel gerçek tedarikçi |
| rate_unit | enum: hourly \| daily \| fixed | Bu atamaya özel birim |
| quantity_units | decimal (nullable) | Saat/gün sayısı (fixed ise boş) |
| cost | decimal | Toplam maliyet (rate × units önerisi, elle değişir; fixed ise doğrudan) |
| notes | text (nullable) | |
| created_by | uuid → users.id | |
| created_at | timestamp | |

### İş Kuralları

1. **Atama oluşturma:** `available` ise atama + `status → in_use`. `in_use` ise field_worker engellenir; admin/manager **somut çakışma uyarısıyla** açık onay verirse atanabilir (katı engelleme yok, sessiz izin asla yok):
   > "Bu ekipman [start_date]–[end_date] arasında [order_no] numaralı iş emrinde kullanımda. Yeni atama yapmak istediğinize emin misiniz?"

2. **İade ve silme — TEK state-transition kuralı:** Bir atama iade edildiğinde (`end_date` set) **veya silindiğinde**, o ekipmana ait başka açık atama (`end_date = null`) kalıp kalmadığına bakılır; hiç kalmamışsa `available`, varsa `status` değişmez. Temel invariant: `in_use` ⇔ en az bir açık atama; `available` ⇔ hiç açık atama yok.

   **PUT handler (iade):**
   ```ts
   await trx('equipment_assignments').where({ id: assignmentId }).update({ end_date });
   const stillOpen = await trx('equipment_assignments')
     .where({ equipment_id: assignment.equipment_id }).whereNull('end_date').first();
   if (!stillOpen) {
     await trx('equipment').where({ id: assignment.equipment_id }).update({ status: 'available' });
   }
   ```

   **Çift iade kuralı (GPT):** İstek `end_date` içeriyor ama kaydın `end_date`'i zaten doluysa → `400 'Bu atama zaten iade edilmiş'`. Kapalı kayıtta `cost`/`notes` güncellemesine izin verilir (nihai fatura sonradan gelebilir).

   **DELETE handler (silme):**
   ```ts
   const assignment = await trx('equipment_assignments').where({ id: assignmentId }).first();
   if (!assignment) throw new Error('Kayıt bulunamadı');
   const wasOpen = assignment.end_date === null;
   await trx('equipment_assignments').where({ id: assignmentId }).del();
   if (wasOpen) {
     const stillOpen = await trx('equipment_assignments')
       .where({ equipment_id: assignment.equipment_id }).whereNull('end_date').first();
     if (!stillOpen) {
       await trx('equipment').where({ id: assignment.equipment_id }).update({ status: 'available' });
     }
   }
   ```
   (Silinen kayıt kapalıysa status kontrolüne gerek yok.)

3. **Maliyet hesaplama:** İş emri maliyet raporundaki `equipment_cost`, `equipment_assignments.cost` toplamı.
4. **Silme kısıtı:** Aktif ataması olan ekipman pasife alınamaz.
5. **Transaction zorunluluğu:** POST, PUT ve DELETE endpoint'leri `equipment_assignments` yazımı/silinmesi ile `equipment.status` güncellemesini aynı `db.transaction()` bloğunda yapmalı.

### Backend Endpoint'leri

**Katalog (`/api/equipment`):** GET liste (filtre: search/status/ownership) • GET :id (detay + atama geçmişi) • POST (admin) • PUT :id (admin) • DELETE :id (pasife al; aktif atama varsa reddet)

**İş emri altında atama:**
- `POST /work-orders/:id/equipment` — `{ equipment_id, start_date, end_date?, supplier_name?, rate_unit, quantity_units?, cost, notes? }` — transaction
- `PUT /work-orders/:id/equipment/:assignmentId` — iade/cost — transaction (çift iadeye 400)
- `DELETE /work-orders/:id/equipment/:assignmentId` — transaction (state-transition kuralı)

### Frontend
1. **Yeni sayfa "Ekipmanlar"** (`/equipment`) — ProductList deseni: arama, durum rozeti (Boşta/Kullanımda/Bakımda), sahiplik rozeti (Kendi Malı/Kiralık), admin ekle/düzenle dialogu.
2. **Ekipman detay** (`/equipment/:id`) — bilgiler + geçmiş atama tablosu + **toplam maliyet** (Faz 1'e alındı).
3. **WorkOrderDetail → Ekipman sekmesi:** kataloğdan Select; seçince default'lar formu doldurur (hepsi değiştirilebilir); Başlangıç/Bitiş (opsiyonel), Tedarikçi, Fiyat Birimi, Saat/Gün (fixed ise gizli), Maliyet (öneri, elle değişir); çakışma uyarısı; aktif kayıtlarda "İade Et".

### Veri Göçü (Migration)
1. İki tabloyu oluştur.
2. Her benzersiz `equipment_type` için katalog satırı (varsayılan: `ownership: 'rented'`, `status: 'available'`, `default_rate_unit: 'daily'`).
3. Her eski log için atama: `start_date = end_date = eski date`, `cost = eski rental_cost`, **`rate_unit: 'fixed'`** (eski veride birim kırılımı bilinmiyor; 'daily' yanlış kesinlik verir).
4. Eski `equipment_logs` tablosunu rollback güvenliği için koru.

### Zorunlu Yan Değişiklik: `reports.ts`
İki endpoint hâlâ `equipment_logs`/`rental_cost` okuyor: `GET /work-order-costs/:id` (reduce) ve `GET /cost-by-client` (raw SQL alt sorgusu). İkisi de `equipment_assignments.cost`'a yönlendirilmeli — yoksa migration sonrası "Maliyet Özeti" ve "Kurum Dağılımı" sessizce eski tabloyu okur. **Faz 1'in zorunlu parçası.**

### Faz Ayrımı
- **Faz 1:** yukarıdaki tüm şema + endpoint + temel arayüz + reports.ts güncellemesi.
- **Faz 2:** çakışma takvimi (gantt), bakım hatırlatması, planlanan vs gerçekleşen kira, uzatma tarihçesi.
- **Gelecek notu:** bir kiralama birden fazla iş emrine yayılırsa `equipment_rentals` + `equipment_usage` ayrımı düşünülebilir; şu an gereksiz.

---

## Önerilen Uygulama Sırası

1. **Sorun 1** — merkezileştir → `dark:` varyantları → (blok bu PR'da kalır; silme kozmetik PR'a). Yıllık preset iliştirilebilir.
2. **Sorun 4** — iki yazma yolu + duplicate engeli.
3. **Sorun 3** — tiebreaker + invalidate listesi.
4. **Küçük paket** — `external_ref` + stok izlenebilirlik (tek migration).
5. **Sorun 2** — transaction'lı Faz 1, reports.ts dahil.

## Dürüst Uyarılar
- Bu plan **kağıt üzerinde** doğrulandı; gerçek repo çalıştırılmadı. Implementasyonda TS tip sürtünmeleri, migration sırası, query key isimleri gibi küçük sorunlar çıkabilir — bunlar tasarım hatası değil, normal süreçtir.
- Override bloğu silme koşulu (Sorun 1, madde 3) uygulanmadan blok silinirse 6 alanda koyu tema regresyonu olur.