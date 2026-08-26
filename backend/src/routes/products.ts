import { Router, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { productSchema, productUpdateSchema, productCostSchema } from '../validation/schemas';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const query = db('products').where({ is_active: true });
    
    if (req.query.search) {
      const search = `%${req.query.search}%`;
      query.where(function() {
        this.where('name', 'like', search).orWhere('code', 'like', search);
      });
    }

    const [{ count }] = await query.clone().count('* as count');
    const products = await query.limit(limit).offset(offset).orderBy('created_at', 'desc');

    res.json({
      data: products,
      pagination: { total: Number(count), page, limit, pages: Math.ceil(Number(count) / limit) }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/alerts/critical-stock', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await db('products').whereRaw('current_stock < min_stock_level').andWhere({ is_active: true });
    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/costs', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await db('product_cost_history')
      .where({ product_id: req.params.id })
      .orderBy('effective_date', 'desc');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/movements', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await db('stock_movements')
      .where({ 'stock_movements.product_id': req.params.id })
      .leftJoin('users as creator', 'stock_movements.created_by', 'creator.id')
      .select('stock_movements.*', 'creator.name as creator_name')
      .orderBy('stock_movements.created_at', 'desc');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await db('products').where({ id: req.params.id, is_active: true }).first();
    if (!product) {
      res.status(404).json({ error: 'Ürün bulunamadı' });
      return;
    }
    const costHistory = await db('product_cost_history').where({ product_id: product.id }).orderBy('effective_date', 'desc');
    res.json({ ...product, cost_history: costHistory });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAdmin, validateRequest(productSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { initial_cost, ...productData } = req.body;
    const id = uuidv4();

    await db.transaction(async (trx) => {
      await trx('products').insert({ id, ...productData });
      if (typeof initial_cost === 'number' && initial_cost > 0) {
        await trx('product_cost_history').insert({
          id: uuidv4(),
          product_id: id,
          unit_cost: initial_cost,
          effective_date: new Date().toISOString().slice(0, 10),
          notes: 'Açılış maliyeti'
        });
      }
    });

    const product = await db('products').where({ id }).first();
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAdmin, validateRequest(productUpdateSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await db('products').where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() });
    if (count === 0) {
      res.status(404).json({ error: 'Ürün bulunamadı' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await db('products').where({ id: req.params.id }).update({ is_active: false, updated_at: db.fn.now() });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cost', requireAdmin, validateRequest(productCostSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = uuidv4();
    await db('product_cost_history').insert({ id, product_id: req.params.id, ...req.body });
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/costs/:costId', requireAdmin, validateRequest(productCostSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const latest = await db('product_cost_history')
      .where({ product_id: req.params.id })
      .orderBy('effective_date', 'desc')
      .orderBy('created_at', 'desc')
      .first();
    if (!latest || latest.id !== req.params.costId) {
      res.status(400).json({ error: 'Sadece en güncel maliyet kaydı düzenlenebilir' });
      return;
    }
    await db('product_cost_history').where({ id: req.params.costId }).update(req.body);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
