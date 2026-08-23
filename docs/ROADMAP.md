# ANSAVA STOK — ROADMAP (Sunum Sonrası)

Bu doküman sunum sonrasında planlanan yeni nesil özellikleri ve altyapı iyileştirmelerini içermektedir.

## 1. Dışa Aktarım ve Şablonlar
- **Excel/PDF Şablonları:** İş emri formları ve detaylı stok raporları için kurumsal (logolu, imzalı) PDF çıktıları alınması ve gelişmiş Excel şablonları oluşturulması.

## 2. Mobil ve Saha Kolaylıkları
- **Barkod/QR Kod Okuma:** Sahada veya depoda telefon kamerasından ürün üzerindeki QR/Barkod'un okutularak hızlı stok çıkışı veya sayımının yapılması.
- **PWA Çevrimdışı (Offline) Desteği:** Sahada internet bağlantısının olmadığı veya zayıf olduğu durumlarda (ör: metro/tünel altı) verilerin offline olarak cihaza kaydedilmesi, bağlantı geldiğinde backend'e senkronize edilmesi.

## 3. Altyapı ve Veritabanı
- **PostgreSQL Geçişi:** Mevcut SQLite yapısından, daha yüksek concurrent (eşzamanlı) işlem kapasitesi, gelişmiş replikasyon ve yedekleme sağlayan PostgreSQL veritabanına geçiş (Prisma veya gelişmiş Knex migration).
- **Test Altyapısı:** Jest ve Cypress gibi araçlarla birim (unit), entegrasyon ve E2E (uçtan uca) testlerinin CI/CD süreçlerine dahil edilmesi.

## 4. Bildirim ve Uyarılar
- **E-posta Kritik Stok Bildirimi:** Kritik stok sınırının (minimum stok) altına inildiğinde ilgili depo görevlisine veya yöneticilere otomatik e-posta gönderimi ve uygulama içi anlık bildirimler.
