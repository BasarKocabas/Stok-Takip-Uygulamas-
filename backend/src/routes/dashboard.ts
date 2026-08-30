import { Router, Response, NextFunction } from 'express';
import db from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/summary', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [{ total_products }] = await db('products').where({ is_active: true }).count('* as total_products');
    
    // Single query calculation for total_stock_value using latest cost from product_cost_history
    const [result] = await db('products')
      .where({ is_active: true })
      .select(
        db.raw(`COALESCE(SUM(current_stock * COALESCE((
          SELECT unit_cost FROM product_cost_history pch
          WHERE pch.product_id = products.id
          ORDER BY effective_date DESC LIMIT 1
        ), 0)), 0) as total_stock_value`)
      );

    const total_stock_value = Number(result?.total_stock_value || 0);

    const [{ open_work_orders }] = await db('work_orders').where({ is_active: true }).whereIn('status', ['draft', 'open', 'in_progress']).count('* as open_work_orders');
    const [{ critical_stock_count }] = await db('products').where({ is_active: true }).whereRaw('current_stock < min_stock_level').count('* as critical_stock_count');
    const [{ pending_approvals }] = await db('stock_movements').where({ is_approved: false, is_rejected: false }).count('* as pending_approvals');

    res.json({
      total_products: Number(total_products),
      total_stock_value,
      open_work_orders: Number(open_work_orders),
      critical_stock_count: Number(critical_stock_count),
      pending_approvals: Number(pending_approvals)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/recent-movements', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const movements = await db('stock_movements')
      .leftJoin('products', 'stock_movements.product_id', 'products.id')
      .select('stock_movements.*', 'products.name as product_name', 'products.unit as product_unit', 'products.code as product_code')
      .orderBy('stock_movements.created_at', 'desc')
      .limit(10);
    res.json(movements);
  } catch (error) {
    next(error);
  }
});

router.get('/work-order-stats', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await db('work_orders').where({ is_active: true }).select('status').count('* as count').groupBy('status');
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
