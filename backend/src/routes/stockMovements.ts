import { Router, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { stockMovementSchema } from '../validation/schemas';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const query = db('stock_movements')
      .leftJoin('products', 'stock_movements.product_id', 'products.id')
      .leftJoin('users as creator', 'stock_movements.created_by', 'creator.id')
      .leftJoin('users as approver', 'stock_movements.approved_by', 'approver.id')
      .select(
        'stock_movements.*',
        'products.name as product_name',
        'products.code as product_code',
        'products.unit as product_unit',
        'creator.name as creator_name',
        'approver.name as approver_name'
      );
    
    if (req.query.movement_type) query.where('stock_movements.movement_type', req.query.movement_type);
    if (req.query.is_approved !== undefined) query.where('stock_movements.is_approved', req.query.is_approved === 'true');

    const [{ count }] = await query.clone().count('stock_movements.id as count');
    const movements = await query.limit(limit).offset(offset).orderBy('stock_movements.created_at', 'desc');

    res.json({
      data: movements,
      pagination: { total: Number(count), page, limit, pages: Math.ceil(Number(count) / limit) }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', validateRequest(stockMovementSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { product_id, work_order_id, movement_type, quantity, notes } = req.body;
    
    const product = await db('products').where({ id: product_id, is_active: true }).first();
    if (!product) {
      res.status(404).json({ error: 'Ürün bulunamadı' });
      return;
    }

    if (work_order_id) {
      const wo = await db('work_orders').where({ id: work_order_id, is_active: true }).first();
      if (!wo) {
        res.status(404).json({ error: 'İş emri bulunamadı' });
        return;
      }
      if (wo.approval_status === 'rejected') {
        res.status(400).json({ error: 'Reddedilmiş iş emri için çıkış talebi oluşturulamaz' });
        return;
      }
    }
    
    const id = uuidv4();
    await db('stock_movements').insert({
      id, product_id, work_order_id, movement_type, quantity, notes,
      is_approved: false, created_by: req.user?.id
    });
    res.status(201).json({ success: true, message: 'Hareket onaya gönderildi' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/approve', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const movement = await db('stock_movements').where({ id: req.params.id }).first();
    if (!movement) {
      res.status(404).json({ error: 'Hareket bulunamadı' });
      return;
    }
    if (movement.is_approved) {
      res.status(400).json({ error: 'Bu hareket zaten onaylanmış' });
      return;
    }
    await db.transaction(async (trx) => {
      const product = await trx('products').where({ id: movement.product_id }).first();
      if (!product) {
        throw new Error('Ürün bulunamadı');
      }

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
      } else if (movement.movement_type === 'IN') {
        await trx('products').where({ id: movement.product_id }).increment('current_stock', movement.quantity);
      } else {
        throw new Error('Geçersiz işlem');
      }

      await trx('stock_movements').where({ id: movement.id }).update({
        is_approved: true,
        approved_by: req.user?.id,
        approved_at: trx.fn.now()
      });
    });
    res.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Yetersiz stok') {
      res.status(400).json({ error: 'Onaylamak için yetersiz stok. İşlem reddedildi.' });
    } else if (error.message === 'Onaylanan miktar aşılıyor') {
      res.status(400).json({ error: 'Bu hareket onaylanırsa kullanılan miktar, onaylanan miktarı aşacak. İşlem reddedildi.' });
    } else if (error.message === 'Ürün bulunamadı' || error.message === 'Geçersiz işlem') {
      res.status(400).json({ error: error.message });
    } else {
      next(error);
    }
  }
});

export default router;
