import { Router, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { equipmentSchema, equipmentUpdateSchema } from '../validation/schemas';

const router = Router();
router.use(authenticate);

// ──────────────────── CATALOG CRUD ────────────────────

// GET /api/equipment — list with filters
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let query = db('equipment');
    
    if (req.user?.role === 'admin' && req.query.include_inactive === 'true') {
      // Admin requesting inactive items: do not filter by is_active
    } else {
      query = query.where({ is_active: true });
    }

    if (req.query.search) {
      const s = `%${req.query.search}%`;
      query.where((q) => q.where('name', 'like', s).orWhere('equipment_type', 'like', s).orWhere('serial_or_plate_no', 'like', s));
    }
    if (req.query.status) query.where({ status: req.query.status });
    if (req.query.ownership) query.where({ ownership: req.query.ownership });

    const [{ count }] = await query.clone().count('* as count');
    const equipment = await query.limit(limit).offset(offset).orderBy('created_at', 'desc');

    res.json({
      data: equipment,
      pagination: { total: Number(count), page, limit, pages: Math.ceil(Number(count) / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/mini — lightweight list for selects
router.get('/mini', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let query = db('equipment');
    
    if (req.user?.role !== 'admin' || req.query.include_inactive !== 'true') {
      query = query.where({ is_active: true });
    }

    const rows = await query
      .select('id', 'name', 'equipment_type', 'ownership', 'status', 'default_supplier_name', 'default_rate_unit', 'default_rate_cost')
      .orderBy('name');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/:id — detail + assignment history
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let query = db('equipment').where({ id: req.params.id });
    
    if (req.user?.role !== 'admin' || req.query.include_inactive !== 'true') {
      query = query.where({ is_active: true });
    }

    const item = await query.first();
    if (!item) {
      res.status(404).json({ error: 'Ekipman bulunamadı' });
      return;
    }

    const assignments = await db('equipment_assignments')
      .where({ equipment_id: req.params.id })
      .leftJoin('work_orders', 'equipment_assignments.work_order_id', 'work_orders.id')
      .leftJoin('users', 'equipment_assignments.created_by', 'users.id')
      .select(
        'equipment_assignments.*',
        'work_orders.order_no',
        'work_orders.title as work_order_title',
        'users.name as creator_name'
      )
      .orderBy('equipment_assignments.start_date', 'desc');

    const totalCost = assignments.reduce((sum: number, a: any) => sum + Number(a.cost || 0), 0);

    res.json({ ...item, assignments, total_cost: totalCost });
  } catch (error) {
    next(error);
  }
});

// POST /api/equipment — create catalog entry (admin)
router.post('/', requireAdmin, validateRequest(equipmentSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = uuidv4();
    await db('equipment').insert({ id, ...req.body });
    const created = await db('equipment').where({ id }).first();
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

// PUT /api/equipment/:id — update catalog entry (admin)
router.put('/:id', requireAdmin, validateRequest(equipmentUpdateSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await db('equipment')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() });
    if (count === 0) {
      res.status(404).json({ error: 'Ekipman bulunamadı' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/equipment/:id — soft-delete (admin); block if active assignments
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeAssignment = await db('equipment_assignments')
      .where({ equipment_id: req.params.id })
      .whereNull('end_date')
      .first();
    if (activeAssignment) {
      res.status(400).json({ error: 'Aktif ataması olan ekipman pasife alınamaz' });
      return;
    }
    await db('equipment')
      .where({ id: req.params.id })
      .update({ 
        is_active: false, 
        deactivated_by: req.user?.id,
        deactivated_at: db.fn.now(),
        updated_at: db.fn.now() 
      });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
