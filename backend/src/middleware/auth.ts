import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../db/connection'; // NEW IMPORT

dotenv.config();

function resolveSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('[auth] JWT_SECRET yok — dev fallback kullanılıyor');
  return 'izbeton-dev-only-fallback';
}

export const JWT_SECRET: string = resolveSecret();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    is_authorized_creator: boolean;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Yetkilendirme hatası: Token bulunamadı' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // NEW: re-check against the DB instead of trusting the token's claims blindly
    const user = await db('users').where({ id: decoded.id }).first();
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'Hesap devre dışı veya bulunamadı, lütfen tekrar giriş yapın' });
      return;
    }
    if (
      user.role !== decoded.role ||
      Boolean(user.is_authorized_creator) !== Boolean(decoded.is_authorized_creator)
    ) {
      res.status(401).json({ error: 'Yetki bilgileriniz değişti, lütfen tekrar giriş yapın' });
      return;
    }

    req.user = {
      id: user.id,
      role: user.role,
      is_authorized_creator: Boolean(user.is_authorized_creator),
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Geçersiz token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    return;
  }
  next();
};

export const requireAuthorizedCreator = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin' && !req.user?.is_authorized_creator) {
    res.status(403).json({ error: 'İş emri oluşturma yetkiniz yok' });
    return;
  }
  next();
};
