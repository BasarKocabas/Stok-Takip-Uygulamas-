import { Router, Response, NextFunction } from 'express';
import db from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/stock-movements', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { start_date, end_date } = req.query;
    const query = db('stock_movements')
      .join('products', 'stock_movements.product_id', 'products.id')
      .select('products.name', 'products.code', 'stock_movements.movement_type')
      .sum('stock_movements.quantity as total_quantity')
      .where('stock_movements.is_approved', true)
      .groupBy('products.id', 'stock_movements.movement_type');

    if (start_date) query.where('stock_movements.created_at', '>=', start_date as string);
    if (end_date) query.where('stock_movements.created_at', '<=', `${end_date} 23:59:59`);

    const results = await query;
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/work-order-costs/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await db('work_orders').where({ id: req.params.id }).first();
    if (!order) {
      res.status(404).json({ error: 'İş emri bulunamadı' });
      return;
    }
    if (order.approval_status === 'rejected') {
      res.status(409).json({ error: 'Reddedilmiş iş emirlerinin maliyet raporu oluşturulamaz' });
      return;
    }

    const [matResult] = await db('work_order_items as wi')
      .where({ 'wi.work_order_id': req.params.id })
      .select(
        db.raw(`COALESCE(SUM(wi.used_quantity * COALESCE((
          SELECT unit_cost FROM product_cost_history pch
          WHERE pch.product_id = wi.product_id
          ORDER BY effective_date DESC LIMIT 1
        ), 0)), 0) as material_cost`)
      );

    const materialCost = Number(matResult?.material_cost || 0);

    const labor = await db('labor_logs').where({ work_order_id: req.params.id });
    const equipment = await db('equipment_assignments').where({ work_order_id: req.params.id });

    const laborCost = labor.reduce((sum, log) => sum + (log.hours_worked * log.hourly_rate), 0);
    const equipmentCost = equipment.reduce((sum, log) => sum + Number(log.cost || 0), 0);

    res.json({
      work_order_id: req.params.id,
      material_cost: materialCost,
      labor_cost: laborCost,
      equipment_cost: equipmentCost,
      total_cost: materialCost + laborCost + equipmentCost
    });
  } catch (error) {
    next(error);
  }
});

router.get('/cost-by-client', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { start_date, end_date } = req.query;
    const bindings: any[] = [];
    let dateClause = '';
    
    if (start_date) {
      dateClause += ' AND wo.created_at >= ?';
      bindings.push(start_date);
    }
    if (end_date) {
      dateClause += ' AND wo.created_at <= ?';
      bindings.push(`${end_date} 23:59:59`);
    }

    const results = await db.raw(`
      SELECT wo.client_type,
             COUNT(DISTINCT wo.id) AS order_count,
             COALESCE(SUM(mat.material_cost), 0) +
             COALESCE(SUM(lab.labor_cost), 0) +
             COALESCE(SUM(eq.equipment_cost), 0) AS total_cost
      FROM work_orders wo
      LEFT JOIN (
        SELECT wi.work_order_id,
               SUM(wi.used_quantity * COALESCE((
                 SELECT unit_cost FROM product_cost_history pch
                 WHERE pch.product_id = wi.product_id
                 ORDER BY effective_date DESC LIMIT 1), 0)) AS material_cost
        FROM work_order_items wi GROUP BY wi.work_order_id
      ) mat ON mat.work_order_id = wo.id
      LEFT JOIN (
        SELECT work_order_id, SUM(hours_worked * hourly_rate) AS labor_cost
        FROM labor_logs GROUP BY work_order_id
      ) lab ON lab.work_order_id = wo.id
      LEFT JOIN (
        SELECT work_order_id, SUM(cost) AS equipment_cost
        FROM equipment_assignments GROUP BY work_order_id
      ) eq ON eq.work_order_id = wo.id
      WHERE wo.is_active = 1 AND wo.approval_status = 'approved' ${dateClause}
      GROUP BY wo.client_type
    `, bindings);
    
    res.json(results || []);
  } catch (error) {
    next(error);
  }
});

export default router;
