# ChatGPT Planı - İş Emri / Stok Takip Web Uygulaması

## Doküman Amacı

Bu doküman, müşteriden gelen el yazısı taslağın analiz edilmesi, gereksinimlerin çıkarılması, MVP kapsamının belirlenmesi ve teknik mimarinin oluşturulması amacıyla hazırlanmıştır.

Bu doküman aynı zamanda farklı yapay zeka modellerinin yorumlarını toplayarak ortak bir geliştirme planı oluşturmak için kullanılacaktır.

---

# 1. Taslaktan Çıkarılan İlk Gereksinimler

> Not: El yazısı net olmadığı için aşağıdaki maddeler varsayımsaldır ve müşteri ile doğrulanmalıdır.

## Operasyonel Modüller

### 1. İş Emri Yönetimi
- İş emri oluşturma
- İş emri güncelleme
- İş emri kapatma
- İş emri geçmişi

### 2. Stok Yönetimi
- Mal girişi
- Mal çıkışı
- Stok durumu görüntüleme
- Kritik stok uyarıları

### 3. Personel Takibi
- İşlem yapan personel
- İş emri sorumlusu
- İşlem geçmişi

### 4. Malzeme Takibi
- Ürün kodu
- Ürün adı
- Ölçü birimi
- Miktar
- Birim maliyet

### 5. Raporlama
- Günlük rapor
- Haftalık rapor
- Aylık rapor
- Mal giriş raporu
- Mal çıkış raporu
- Stok hareket raporu

### 6. Uyarı Sistemi
- Kritik stok seviyesi
- Tamamlanmamış iş emirleri
- Süresi geçen işlemler

---

# 2. Müşteriye Sorulması Gereken Sorular

## İş Emri
- İş emri tam olarak neyi temsil ediyor?
- Bir iş emri birden fazla ürün kullanabilir mi?
- İş emri aşamaları neler?

## Stok
- Seri numarası takibi gerekli mi?
- Lot takibi gerekli mi?
- Depo bazlı stok var mı?

## Personel
- Rol sistemi gerekli mi?
- Yetkilendirme gerekli mi?

## Raporlama
- Excel çıktısı gerekli mi?
- PDF çıktısı gerekli mi?
- Dashboard gerekli mi?

## Entegrasyon
- ERP entegrasyonu olacak mı?
- Barkod sistemi olacak mı?
- QR kod sistemi olacak mı?

---

# 3. MVP Kapsamı

Sunum için hazırlanacak ilk versiyon.

## Dahil

### Dashboard
- Toplam stok
- Kritik stok sayısı
- Açık iş emri sayısı
- Son işlemler

### İş Emirleri
- Listeleme
- Oluşturma
- Güncelleme
- Detay görüntüleme

### Ürünler
- Listeleme
- Ekleme
- Güncelleme
- Silme

### Stok Hareketleri
- Mal girişi
- Mal çıkışı
- Hareket geçmişi

### Personeller
- Listeleme
- Ekleme
- Güncelleme

### Raporlar
- Günlük
- Haftalık
- Aylık

---

# 4. Önerilen Teknik Mimari

## Frontend

### Seçenek A (Önerilen)
- React
- TypeScript
- Vite
- TanStack Query
- React Hook Form
- Zod
- TailwindCSS
- Shadcn/UI

### Seçenek B
- Next.js
- TypeScript
- Tailwind

---

## Backend

### Önerilen
- Express.js
- TypeScript
- Knex.js
- SQLite

Avantajları:
- Hızlı geliştirme
- Demo için ideal
- Kurulumu kolay
- Sonradan PostgreSQL'e geçilebilir

---

## Database

### İlk Faz
SQLite

### Üretim Ortamı
PostgreSQL

---

# 5. Önerilen Veritabanı Tasarımı

*Bu alan genel taslaktır. Nihai şema, 14. maddedeki Overall Plan'da yer almaktadır.*

---

# 6. Demo Senaryosu

Sunum sırasında gösterilecek akış.

## Senaryo 1
Yeni ürün oluştur.
Örnek:
- Çelik Boru
- Alüminyum Profil
- Sac Levha

## Senaryo 2
Depoya mal giriş yap.
Örnek:
- +100 adet

## Senaryo 3
İş emri oluştur.
Örnek:
"Makine Revizyonu"

## Senaryo 4
İş emrinde malzeme kullan.
Örnek:
- 20 adet çelik boru
Sistem stoktan düşsün.

## Senaryo 5
Dashboard'u göster.
- Açık iş emirleri
- Kalan stoklar
- Kritik stoklar

---

# 7. Riskler

- El yazısı notlar eksik yorumlanmış olabilir.
- Süreç üretim odaklı mı depo odaklı mı net değil.
- Barkod ihtiyacı olabilir.
- Çoklu depo ihtiyacı olabilir.
- Maliyet hesapları detaylı olabilir.

---

# 8. ChatGPT Önerileri (Burayı sadece ChatGPT doldurabilir)

## Genel Yaklaşım
Müşteri detayları netleştirene kadar sistemi:
**"İş Emri + Stok Hareketleri + Personel Takibi"**
üzerine kurmak.

Bu yaklaşım:
- Sunum için yeterli
- Genişletilebilir
- Müşterinin notlarıyla uyumlu görünmekte
- Düşük geliştirme maliyetine sahip

---

# 9. Claude Analizi (Burayı sadece Claude doldurabilir)

## Model
Claude

## Yorumlar
- **Yetkili personel listesi somut:** Not üzerinde "İş emri giriş modülü" yanında birkaç isim geçiyor (Veysel / Barış / Mustafa gibi görünüyor)[cite: 1]. Bu, tam bir rol-tabanlı yetkilendirme sisteminden çok, iş emri açabilecek kişilerin **sabit ve kısıtlı bir liste** olduğunu gösteriyor — MVP için karmaşık RBAC yerine basit bir "yetkili kullanıcı" alanı yeterli olabilir[cite: 1].
- **Stok toleransı bir iş kuralı:** "Fazla istenmiyor, az olursa sorun yok" notu önemli — talep edilen miktarın üzerine çıkan taleplerde sistemin uyarı/engelleme göstermesi, eksik talepte ise serbest bırakması gerekiyor[cite: 1].
- **Ürün kodu zaman içinde değişebiliyor:** "Ürün malzeme kodu değişiyor, piyasa buna göre maliyetini yükleyecek" notu, ürün kodlarının/fiyatlarının statik olmadığını, piyasa koşullarına göre güncellendiğini gösteriyor[cite: 1]. Bu, `products` tablosunda tekil `unit_cost` alanı yerine bir **maliyet geçmişi (price history)** yapısı gerektirebilir[cite: 1].
- **Telefonla giriş + onay akışı, Gemini'nin dediği gibi net:** "Tel. ile giriş", "Kabulden sonra işlem başlayacak", "Girişe admin onayı" notları, sahadan gelen talebin önce bir **"pending" (beklemede)** durumunda tutulup, admin onayından sonra resmi stok hareketine dönüşmesi gerektiğini teyit ediyor[cite: 1].
- **Ekipman/kablo notu daha spesifik olabilir:** Sayfa altındaki "80V+400 kablo... ayrı tutulacak" notu sebebiyle `equipment_logs` tablosuna serbest metin yerine en azından `equipment_type` + `specs` alanı eklenmesi faydalı olur[cite: 1].

## Önerilen Değişiklikler
- `products` tablosuna `cost_history` (id, product_id, unit_cost, effective_date) alt tablosu eklenmesi — geçmiş maliyet raporlarının doğruluğu için[cite: 1].
- `work_orders` tablosuna yetkili personel kısıtı için basit bir `authorized_creators` alanı/tablosu[cite: 1].
- Stok talebi onay akışına `requested_quantity` vs `approved_quantity` ayrımı — üst limit kontrolü burada yapılabilir[cite: 1].
- `equipment_logs` tablosuna `equipment_type` ve opsiyonel `specs` alanı[cite: 1].

---

# 10. Gemini Analizi (Burayı sadece Gemini doldurabilir)

## Model
Gemini

## Yorumlar
- **Bağlam ve Saha Operasyonu:** Notlardaki ANSAVA Mühendislik ve İZBAN referansları ile "belediye talepleri ya da izban talepleri" ayrımı, projenin sadece iç depo takibi değil, sahada yürütülen taşeron/bakım operasyonlarını yönetmek için istendiğini gösteriyor[cite: 1].
- **Mobil Öncelik:** "Tel. ile giriş" (Telefon ile giriş) notu kesin bir gereksinim[cite: 1]. Sahadaki personelin malzeme ve stok girişlerini doğrudan mobil cihazlardan yapacağı açık[cite: 1].
- **Maliyet Çeşitliliği:** Sadece malzeme maliyeti değil; "Ekip yevmiye günlük/saatlik" ve "Ekipman kiralama/imal" notları gösteriyor ki, iş emri maliyeti = Malzeme + İşçilik + Ekipman Kiralama/Amortisman olarak hesaplanmalı[cite: 1].
- **Sıkı Onay Mekanizması:** "Kabulden sonra işlem başlayacak", "Girişe admin onayı", "Yetkilendirme hiyerarşisi" notları, sistemin basit bir kayıt sisteminden ziyade bir "Workflow" (iş akışı) sistemi olmasını zorunlu kılıyor[cite: 1]. Yöneticiler onaylamadan stoktan resmi düşüş olmamalı[cite: 1].

## Önerilen Değişiklikler
- **Mimari:** Frontend uygulamasının PWA (Progressive Web App) olarak kurgulanması veya tamamen "Mobile-First" (Mobil öncelikli) tasarlanması[cite: 1].
- **Genişletilmiş Maliyet Modülü:** `work_order_items` tablosuna ek olarak, `labor_logs` (işçilik kayıtları) ve `equipment_logs` (kiralık ekipman kayıtları) modüllerinin plana dahil edilmesi[cite: 1].
- **Talep Tipleri:** İş emirlerinin `client_type` (Belediye, İzban, Kurum İçi vb.) olarak etiketlenebilmesi ve raporların bu kırılımlara göre alınabilmesi[cite: 1].
- **Onay Durumları (Approval States):** Veritabanı tablolarına `approval_status` (Örn: PENDING_ADMIN, APPROVED, REJECTED) yapısının entegre edilmesi[cite: 1].

---

# 11. Qwen Analizi (Burayı sadece Qwen doldurabilir)

## Model
Qwen

## Yorumlar
- **Veri Bütünlüğü ve Denetim İzi (Audit Trail):** Maliyet geçmişi ve geçmiş raporların doğruluğu için sistemde "fiziksel silme" (hard delete) işlemlerinden kaçınılmalıdır. Silinen bir ürün veya personel, geçmiş bir iş emrinin veya kar-zarar tablosunun çökmesine neden olabilir.
- **İşlem Güvenliği (Transaction Atomicity):** Yönetici bir talebi onayladığında, iş emrinin durumu güncellenirken aynı anda stoktan mal düşüşü yapılır. Veritabanında bu iki işlemin yarım kalmaması ve verilerin tutarsızlaşmaması için tek bir işlem bloğu (DB Transaction) içinde yürütülmesi şarttır.
- **Kritik Stok Tetikleyicileri:** Notlarda mal alımı ve stok durumu uyarıları vurgulanıyor. Sistem sadece ekranda sayıyı göstermekle kalmamalı, stok belirlenen asgari seviyenin altına indiğinde otomatik bir e-posta veya dashboard uyarısı tetiklemelidir.

## Önerilen Değişiklikler
- **Soft Delete (Yumuşak Silme):** Tüm kritik veritabanı tablolarına (`products`, `users`, `work_orders`) `deleted_at` veya `is_active` alanı eklenerek verilerin sadece görünmez yapılması.
- **Veritabanı Transaction Uygulaması:** Stok onayı ve transferi esnasında `Knex.js`'in `.transacting()` yapısının backend üzerinde standartlaştırılması.
- **Arka Plan İşleri (Cron/Job):** Belirli periyotlarda (örneğin her gece) kritik seviye altında kalan stokları listeleyip yöneticilere raporlayacak bir arka plan işinin (Cron Job) sisteme entegre edilmesi.

---

# 12. DeepSeek Analizi (Burayı sadece DeepSeek doldurabilir)

## Model
Henüz doldurulmadı.

## Yorumlar
-

## Önerilen Değişiklikler
-

---

# 13. Diğer AI Modelleri (Burayı sadece ilgili AI doldurabilir)

## Model
-

## Yorumlar
-

## Önerilen Değişiklikler
-

---

# 14. Overall Plan (Nihai Plan)

Bu bölüm; ChatGPT'nin MVP kurgusu, Gemini'nin saha operasyon analizleri, Claude'un dinamik maliyet tespitleri ve Qwen'in veri bütünlüğü yaklaşımlarının birleştirilmesiyle oluşturulmuştur.

## Kesinleşen Gereksinimler
1. **Mobil Kullanım (Saha Uyumluluğu):** Personelin sahada telefon ile malzeme talebi ve iş emri girişi yapabilmesi.
2. **Onay ve Yetki Hiyerarşisi:** İş emri oluşturabilecek personellerin sabit bir listede (Whitelist) tutulması. Admin onayı (Approval Workflow) olmadan depo çıkışının resmileşmemesi.
3. **Stok Toleransı:** Talep edilen malzemenin sistemdeki mevcut stoğu ve belirlenen üst limiti aşmasının engellenmesi (az kullanımda sorun olmaması).
4. **Kapsamlı ve Dinamik Maliyet Takibi:** Malzemelerin geçmişe dönük fiyat değişimlerinin (maliyet geçmişi), saatlik personel yevmiyelerinin ve spesifik ekipman kullanımlarının iş emrine yansıtılması.
5. **Talep Kategorizasyonu:** İş emirlerinin İZBAN, Belediye vb. kırılımında açılıp raporlanabilmesi.
6. **Veri Güvenliği ve Uyarılar:** Verilerin fiziksel olarak silinmemesi (Soft Delete) ve kritik stok seviyelerinin otomatik olarak raporlanması.

## Kesinleşen Mimari
- **Frontend:** React, TypeScript, Vite, TailwindCSS (Mobil öncelikli - PWA tasarım yaklaşımı ile).
- **Backend:** Node.js, Express.js, TypeScript (Hızlı prototipleme ve esnek geliştirme).
- **Database:** SQLite (Geliştirme için), PostgreSQL (Üretim için).
- **Güvenlik Yöntemi:** Stok hareketi ile iş emri güncellemelerinin DB Transaction blokları ile korunması.

## Kesinleşen Veritabanı (Nihai Şema)

- **users:** `id`, `name`, `email`, `role`, `is_authorized_creator`, `is_active` (Soft delete), `created_at`
- **products:** `id`, `code`, `name`, `unit`, `current_stock`, `min_stock_level` (Kritik stok uyarısı için), `is_active`, `created_at`
- **product_cost_history:** `id`, `product_id`, `unit_cost`, `effective_date`
- **work_orders:** `id`, `order_no`, `title`, `client_type` (İzban, Belediye vb.), `status`, `approval_status`, `assigned_user`, `is_active`, `created_at`
- **work_order_items:** `id`, `work_order_id`, `product_id`, `requested_quantity`, `approved_quantity`
- **stock_movements:** `id`, `product_id`, `movement_type` (IN/OUT), `quantity`, `is_approved`, `approved_by`
- **labor_logs:** `id`, `work_order_id`, `user_id`, `hours_worked`, `hourly_rate`, `date`
- **equipment_logs:** `id`, `work_order_id`, `equipment_type`, `specs`, `rental_cost`, `date`

## Kesinleşen Modüller
1. **Saha Operasyon (Mobil):** İş emri görüntüleme, malzeme/ekipman talep etme, işçilik saati girme.
2. **Yönetim/Onay Paneli (Admin):** İstenen/Onaylanan miktar kontrolü, stok limiti yönetimi, "Knex.js Transactions" destekli stok onayı.
3. **Stok ve Fiyat Yönetimi:** Mal giriş/çıkış, `product_cost_history` destekli maliyet yönetimi, kritik seviye "Cron Job" uyarıları.
4. **Kapsamlı Maliyet Raporlama:** Kurum bazlı ve dosya bazlı toplam maliyet (Malzeme + İşçilik + Ekipman) analizleri (silinmeyen aktif/pasif verilerle).

## Sprint 1: Temel Kurulum ve Yetki Altyapısı
- SQLite üzerinde genişletilmiş şemaların (Soft delete ve cost_history dahil) oluşturulması.
- Whitelist tabanlı yetkilendirme ve sistem kimlik doğrulamasının yazılması.
- Ürün, Personel ve Kurum tanımlama ekranlarının (CRUD) geliştirilmesi.

## Sprint 2: Operasyon, Onay Akışları ve İşlem Güvenliği
- Mobil öncelikli iş emri oluşturma arayüzü.
- Sahadan limit kontrollü ("Fazla istenmiyor") malzeme, işçilik ve ekipman taleplerinin girilmesi.
- Admin onay akışının DB Transactions ile korumaya alınarak resmi stok hareketine dönüştürülmesi.

## Sprint 3: Raporlama, Uyarı Sistemi ve Teslimat
- Dashboard kurulumu (Açık emirler, bekleyen onaylar).
- Günlük/haftalık kritik stok uyarısı verecek planlanmış arka plan işlerinin (cron) oluşturulması.
- Kurum bazlı doğru kar-zarar/maliyet raporlarının oluşturulması.
- Mobil arayüz testleri ve MVP sunumu.

## MVP Teslim Tarihi
- (Müşteri görüşmesi sonrası belirlenecektir. Öngörülen: 3-4 Hafta)