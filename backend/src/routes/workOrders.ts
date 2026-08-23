import { Router, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { authenticate, requireAuthorizedCreator, requireAdmin, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { 
  workOrderSchema, 
  workOrderUpdateSchema, 
  workOrderItemSchema, 
  workOrderItemUpdateSchema, 
  laborLogSchema, 
  equipmentLogSchema 
} from '../validation/schemas';

const router = Router();
router.use(authenticate);

async function generateOrderNo() {
  const year = new Date().getFullYear();
  const latest = await db('work_orders').where('order_no', 'like', `IE-${year}-%`).orderBy('order_no', 'desc').first();
  let num = 1;
  if (latest) {
    const parts = latest.order_no.split('-');
    num = parseInt(parts[2]) + 1;
  }
  return `IE-${year}-${num.toString().padStart(3, '0')}`;
}

async function insertWithOrderNo(body: any, userId?: string, tries = 3): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const id = uuidv4();
      const order_no = await generateOrderNo();
      await db('work_orders').insert({
        id,
        order_no,
        created_by: userId,
        ...body
      });
      return await db('work_orders').where({ id }).first();
    } catch (e: any) {
      if (i === tries - 1 || !/unique/i.test(e?.message ?? '')) throw e;
    }
  }
  throw new Error('order_no üretilemedi');
}

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const query = db('work_orders')
      .leftJoin('users as assignee', 'work_orders.assigned_to', 'assignee.id')
      .leftJoin('users as creator', 'work_orders.created_by', 'creator.id')
      .select(
        'work_orders.*',
        'assignee.name as assignee_name',
        'creator.name as creator_name'
      )
      .where({ 'work_orders.is_active': true });
    
    if (req.query.search) {
      const s = `%${req.query.search}%`;
      query.where((q) => q.where('work_orders.order_no', 'like', s).orWhere('work_orders.title', 'like', s));
    }
    if (req.query.status) query.where({ 'work_orders.status': req.query.status });
    if (req.query.approval_status) query.where({ 'work_orders.approval_status': req.query.approval_status });
    if (req.query.client_type) query.where({ 'work_orders.client_type': req.query.client_type });

    const [{ count }] = await query.clone().count('work_orders.id as count');
    const orders = await query.limit(limit).offset(offset).orderBy('work_orders.created_at', 'desc');

    res.json({
      data: orders,
      pagination: { total: Number(count), page, limit, pages: Math.ceil(Number(count) / limit) }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await db('work_orders')
      .leftJoin('users as assignee', 'work_orders.assigned_to', 'assignee.id')
      .leftJoin('users as creator', 'work_orders.created_by', 'creator.id')
      .select(
        'work_orders.*',
        'assignee.name as assignee_name',
        'creator.name as creator_name'
      )
      .where({ 'work_orders.id': req.params.id, 'work_orders.is_active': true })
      .first();

    if (!order) {
      res.status(404).json({ error: 'İş emri bulunamadı' });
      return;
    }
    const items = await db('work_order_items')
      .where({ work_order_id: order.id })
      .leftJoin('products', 'work_order_items.product_id', 'products.id')
      .select(
        'work_order_items.*',
        'products.name as product_name',
        'products.code as product_code',
        'products.unit as product_unit'
      );
    const labor = await db('labor_logs')
      .where({ work_order_id: order.id })
      .leftJoin('users', 'labor_logs.user_id', 'users.id')
      .select('labor_logs.*', 'users.name as user_name');
    const equipment = await db('equipment_logs').where({ work_order_id: order.id });

    res.json({ ...order, items, labor_logs: labor, equipment_logs: equipment });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuthorizedCreator, validateRequest(workOrderSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const newOrder = await insertWithOrderNo(req.body, req.user?.id);
    res.status(201).json(newOrder);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAuthorizedCreator, validateRequest(workOrderUpdateSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await db('work_orders').where({ id: req.params.id }).first();
    if (!order) {
      res.status(404).json({ error: 'İş emri bulunamadı' });
      return;
    }
    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'manager';
    if (!isPrivileged && order.created_by !== req.user?.id) {
      res.status(403).json({ error: 'Bu iş emrini güncelleme yetkiniz yok' });
      return;
    }

    await db('work_orders').where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/approve', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await db('work_orders').where({ id: req.params.id }).first();
    if (!order) {
      res.status(404).json({ error: 'İş emri bulunamadı' });
      return;
    }
    if (order.approval_status !== 'pending') {
      res.status(400).json({ error: 'Bu iş emri zaten sonuçlanmış' });
      return;
    }

    await db('work_orders').where({ id: req.params.id }).update({ 
      approval_status: 'approved', 
      approved_by: req.user?.id, 
      approved_at: db.fn.now(), 
      updated_at: db.fn.now() 
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/reject', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await db('work_orders').where({ id: req.params.id }).first();
    if (!order) {
      res.status(404).json({ error: 'İş emri bulunamadı' });
      return;
    }
    if (order.approval_status !== 'pending') {
      res.status(400).json({ error: 'Bu iş emri zaten sonuçlanmış' });
      return;
    }

    await db('work_orders').where({ id: req.params.id }).update({ 
      approval_status: 'rejected', 
      updated_at: db.fn.now() 
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

async function assertOrderWritable(req: AuthRequest, res: Response): Promise<boolean> {
  const order = await db('work_orders').where({ id: req.params.id }).first();
  if (!order) {
    res.status(404).json({ error: 'İş emri bulunamadı' });
    return false;
  }
  if (order.approval_status === 'rejected') {
    res.status(400).json({ error: 'Reddedilmiş iş emrine kayıt eklenemez' });
    return false;
  }
  const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'manager';
  const canWrite = isPrivileged || order.created_by === req.user?.id || order.assigned_to === req.user?.id;
  if (!canWrite) {
    res.status(403).json({ error: 'Bu iş emrine kayıt ekleme veya güncelleme yetkiniz yok' });
    return false;
  }
  return true;
}

router.post('/:id/items', validateRequest(workOrderItemSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await assertOrderWritable(req, res))) return;
    const id = uuidv4();
    await db('work_order_items').insert({ id, work_order_id: req.params.id, ...req.body });
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/items/:itemId', validateRequest(workOrderItemUpdateSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await assertOrderWritable(req, res))) return;
    const item = await db('work_order_items').where({ id: req.params.itemId, work_order_id: req.params.id }).first();
    if (!item) {
      res.status(404).json({ error: 'Kalem bulunamadı' });
      return;
    }
    if (req.body.approved_quantity != null && Number(req.body.approved_quantity) > Number(item.requested_quantity)) {
      res.status(400).json({ error: 'Onaylanan miktar talep edileni aşamaz' });
      return;
    }

    // İLK ONAY: bekleyen OUT hareketini otomatik oluştur (tek kaynak ilkesi)
    if (req.body.approved_quantity != null && item.approved_quantity == null) {
      await db('stock_movements').insert({
        id: uuidv4(),
        product_id: item.product_id,
        work_order_id: req.params.id,
        movement_type: 'OUT',
        quantity: req.body.approved_quantity,
        is_approved: false,
        created_by: req.user?.id,
        notes: 'İş emri malzeme onayı (otomatik talep)',
      });
    }

    await db('work_order_items').where({ id: req.params.itemId }).update(req.body);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/labor', validateRequest(laborLogSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await assertOrderWritable(req, res))) return;
    const id = uuidv4();
    await db('labor_logs').insert({ id, work_order_id: req.params.id, ...req.body });
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/equipment', validateRequest(equipmentLogSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await assertOrderWritable(req, res))) return;
    const id = uuidv4();
    await db('equipment_logs').insert({ id, work_order_id: req.params.id, ...req.body });
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/items/:itemId', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await assertOrderWritable(req, res))) return;
    const item = await db('work_order_items').where({ id: req.params.itemId, work_order_id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Kalem bulunamadı' }); return; }
    if (Number(item.used_quantity) > 0) { res.status(400).json({ error: 'Kullanılmış malzeme kalemi silinemez' }); return; }
    await db('work_order_items').where({ id: item.id }).del();
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.delete('/:id/labor/:logId', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await assertOrderWritable(req, res))) return;
    const log = await db('labor_logs').where({ id: req.params.logId, work_order_id: req.params.id }).first();
    if (!log) { res.status(404).json({ error: 'Kayıt bulunamadı' }); return; }
    await db('labor_logs').where({ id: log.id }).del();
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.delete('/:id/equipment/:logId', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await assertOrderWritable(req, res))) return;
    const log = await db('equipment_logs').where({ id: req.params.logId, work_order_id: req.params.id }).first();
    if (!log) { res.status(404).json({ error: 'Kayıt bulunamadı' }); return; }
    await db('equipment_logs').where({ id: log.id }).del();
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await db('work_orders').where({ id: req.params.id }).first();
    if (!order) { res.status(404).json({ error: 'İş emri bulunamadı' }); return; }
    await db('work_orders').where({ id: req.params.id }).update({ is_active: false, updated_at: db.fn.now() });
    res.json({ success: true });
  } catch (error) { next(error); }
});

export default router;
