import { Router, Response, NextFunction } from 'express';
import db from '../db/connection';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { userUpdateSchema } from '../validation/schemas';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let query = db('users').select('id', 'name', 'email', 'role', 'is_authorized_creator', 'is_active');
    
    if (req.user?.role === 'admin' && req.query.include_inactive === 'true') {
      // Return all users including inactive
    } else {
      query = query.where({ is_active: true });
    }

    const users = await query;
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      return;
    }
    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAdmin, validateRequest(userUpdateSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.params.id === req.user?.id && (req.body.role !== undefined || req.body.is_authorized_creator !== undefined)) {
      res.status(400).json({ error: 'Kendi rol veya yetkinizi değiştiremezsiniz' });
      return;
    }
    if (req.body.email) {
      const dup = await db('users').where({ email: req.body.email }).whereNot({ id: req.params.id }).first();
      if (dup) {
        res.status(400).json({ error: 'Bu e-posta adresi zaten kullanımda' });
        return;
      }
    }

    const { name, email, role, is_authorized_creator } = req.body;
    const updateData: any = { updated_at: db.fn.now() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (is_authorized_creator !== undefined) updateData.is_authorized_creator = is_authorized_creator;
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;

    const count = await db('users').where({ id: req.params.id }).update(updateData);
    if (count === 0) {
      res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.params.id === req.user?.id) {
      res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
      return;
    }

    await db('users').where({ id: req.params.id }).update({ 
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
