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
  equipmentLogSchema,
  equipmentAssignmentSchema,
  equipmentAssignmentUpdateSchema
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
    const equipmentAssignments = await db('equipment_assignments')
      .where({ 'equipment_assignments.work_order_id': order.id })
      .leftJoin('equipment', 'equipment_assignments.equipment_id', 'equipment.id')
      .leftJoin('users', 'equipment_assignments.created_by', 'users.id')
      .select(
        'equipment_assignments.*',
        'equipment.name as equipment_name',
        'equipment.equipment_type',
        'equipment.ownership',
        'equipment.serial_or_plate_no',
        'users.name as creator_name'
      )
      .orderBy('equipment_assignments.start_date', 'desc');

    res.json({ ...order, items, labor_logs: labor, equipment_logs: equipment, equipment_assignments: equipmentAssignments });
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
    const existing = await db('work_order_items')
      .where({ work_order_id: req.params.id, product_id: req.body.product_id })
      .first();
    if (existing) {
      res.status(400).json({ error: 'Bu üründen zaten bir talep satırı var, miktarı düzenleyin' });
      return;
    }
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

    if (req.body.used_quantity != null) {
      const cap = req.body.approved_quantity ?? item.approved_quantity ?? item.requested_quantity;
      if (Number(req.body.used_quantity) > Number(cap)) {
        res.status(400).json({ error: 'Kullanılan miktar onaylanan (veya talep edilen) miktarı aşamaz' });
        return;
      }
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

// ──── NEW: Equipment Assignment endpoints (transaction-based) ────

router.post('/:id/equipment-assignments', validateRequest(equipmentAssignmentSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await assertOrderWritable(req, res))) return;
    const { equipment_id } = req.body;

    await db.transaction(async (trx) => {
      const eq = await trx('equipment').where({ id: equipment_id }).first();
      if (!eq) {
        res.status(404).json({ error: 'Ekipman bulunamadı' });
        return;
      }

      // field_worker cannot assign in_use equipment; admin/manager gets warning on frontend
      if (eq.status === 'in_use' && req.user?.role === 'field_worker') {
        res.status(400).json({ error: 'Bu ekipman şu anda kullanımda, yöneticinize başvurun' });
        return;
      }

      const id = uuidv4();
      await trx('equipment_assignments').insert({
        id,
        work_order_id: req.params.id,
        created_by: req.user?.id,
        ...req.body,
      });

      // Update equipment status to in_use (if not end_date provided = still active)
      if (!req.body.end_date) {
        await trx('equipment').where({ id: equipment_id }).update({ status: 'in_use', updated_at: db.fn.now() });
      }

      res.status(201).json({ success: true, id });
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/equipment-assignments/:assignmentId', validateRequest(equipmentAssignmentUpdateSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await assertOrderWritable(req, res))) return;

    await db.transaction(async (trx) => {
      const assignment = await trx('equipment_assignments')
        .where({ id: req.params.assignmentId, work_order_id: req.params.id })
        .first();
      if (!assignment) {
        res.status(404).json({ error: 'Atama bulunamadı' });
        return;
      }

      // Double-return protection
      if (req.body.end_date && assignment.end_date) {
        res.status(400).json({ error: 'Bu atama zaten iade edilmiş' });
        return;
      }

      await trx('equipment_assignments')
        .where({ id: req.params.assignmentId })
        .update(req.body);

      // If returning (end_date set), check if equipment has any remaining open assignments
      if (req.body.end_date) {
        const stillOpen = await trx('equipment_assignments')
          .where({ equipment_id: assignment.equipment_id })
          .whereNull('end_date')
          .whereNot({ id: req.params.assignmentId })
          .first();
        if (!stillOpen) {
          await trx('equipment').where({ id: assignment.equipment_id }).update({ status: 'available', updated_at: db.fn.now() });
        }
      }

      res.json({ success: true });
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/equipment-assignments/:assignmentId', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await assertOrderWritable(req, res))) return;

    await db.transaction(async (trx) => {
      const assignment = await trx('equipment_assignments')
        .where({ id: req.params.assignmentId, work_order_id: req.params.id })
        .first();
      if (!assignment) {
        res.status(404).json({ error: 'Atama bulunamadı' });
        return;
      }

      const wasOpen = assignment.end_date === null;
      await trx('equipment_assignments').where({ id: req.params.assignmentId }).del();

      // State transition: if deleted assignment was open, check remaining
      if (wasOpen) {
        const stillOpen = await trx('equipment_assignments')
          .where({ equipment_id: assignment.equipment_id })
          .whereNull('end_date')
          .first();
        if (!stillOpen) {
          await trx('equipment').where({ id: assignment.equipment_id }).update({ status: 'available', updated_at: db.fn.now() });
        }
      }

      res.json({ success: true });
    });
  } catch (error) {
    next(error);
  }
});

// ──── End Equipment Assignments ────

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
