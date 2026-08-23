import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

function resolveSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('[auth] JWT_SECRET yok — dev fallback kullanılıyor');
  return 'ansava-dev-only-fallback';
}

export const JWT_SECRET: string = resolveSecret();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    is_authorized_creator: boolean;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Yetkilendirme hatası: Token bulunamadı' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
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
