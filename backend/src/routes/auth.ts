import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { validateRequest } from '../middleware/validateRequest';
import { loginSchema, registerSchema, profileUpdateSchema, passwordChangeSchema } from '../validation/schemas';
import { authenticate, requireAdmin, AuthRequest, JWT_SECRET } from '../middleware/auth';

const router = Router();

router.post('/login', validateRequest(loginSchema), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await db('users').where({ email, is_active: true }).first();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Geçersiz email veya şifre' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, is_authorized_creator: user.is_authorized_creator },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_authorized_creator: Boolean(user.is_authorized_creator),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/register', authenticate, requireAdmin, validateRequest(registerSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role, is_authorized_creator } = req.body;

    const existing = await db('users').where({ email }).first();
    if (existing) {
      res.status(400).json({ error: 'Bu email zaten kullanımda' });
      return;
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);
    await db('users').insert({
      id,
      name,
      email,
      password_hash,
      role: role || 'field_worker',
      is_authorized_creator: is_authorized_creator || false,
    });

    const user = await db('users').where({ id }).first();
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_authorized_creator: Boolean(user.is_authorized_creator),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await db('users').where({ id: req.user?.id }).first();
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

router.put('/profile', authenticate, validateRequest(profileUpdateSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await db('users').where({ id: req.user?.id }).first();
    if (!user) { res.status(404).json({ error: 'Kullanıcı bulunamadı' }); return; }
    const ok = await bcrypt.compare(req.body.current_password, user.password_hash);
    if (!ok) { res.status(400).json({ error: 'Mevcut şifre hatalı' }); return; }
    const dup = await db('users').where({ email: req.body.email }).whereNot({ id: user.id }).first();
    if (dup) { res.status(400).json({ error: 'Bu e-posta zaten kullanımda' }); return; }
    const name = `${req.body.first_name.trim()} ${req.body.last_name.trim()}`;
    await db('users').where({ id: user.id }).update({ name, email: req.body.email, updated_at: db.fn.now() });
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.put('/password', authenticate, validateRequest(passwordChangeSchema), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await db('users').where({ id: req.user?.id }).first();
    if (!user) { res.status(404).json({ error: 'Kullanıcı bulunamadı' }); return; }
    const ok = await bcrypt.compare(req.body.current_password, user.password_hash);
    if (!ok) { res.status(400).json({ error: 'Mevcut şifre hatalı' }); return; }
    const password_hash = await bcrypt.hash(req.body.new_password, 10);
    await db('users').where({ id: user.id }).update({ password_hash, updated_at: db.fn.now() });
    res.json({ success: true });
  } catch (error) { next(error); }
});

export default router;
