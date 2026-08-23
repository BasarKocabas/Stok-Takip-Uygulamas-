import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import db from './db/connection';
import cron from 'node-cron';

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Attempt basic query to verify connection
    await db.raw('SELECT 1');
    console.log('Database connected.');

    // Cron job for daily critical stock check
    cron.schedule('0 9 * * *', async () => {
      try {
        console.log('[CRON] Günlük kritik stok kontrolü başlatıldı...');
        const critical = await db('products').whereRaw('current_stock < min_stock_level').andWhere({ is_active: true });
        if (critical.length > 0) {
          const list = critical.map((p: any) => `${p.code} (${p.name}: ${p.current_stock}/${p.min_stock_level} ${p.unit})`).join(', ');
          console.warn(`[CRON UYARI] ${critical.length} ürün kritik stok seviyesinin altında: ${list}`);
        } else {
          console.log('[CRON] Tüm ürünlerin stok seviyeleri yeterli.');
        }
      } catch (err) {
        console.error('[CRON HATA] Kritik stok kontrolü başarısız:', err);
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
