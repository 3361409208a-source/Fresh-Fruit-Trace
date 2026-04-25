import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import store from '../db';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'fresh_fruit_trace_secret_key_2024';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: '未登录，请先登录' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { userId: decoded.userId, tenantId: decoded.tenantId, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: '需要管理员权限' });
    return;
  }
  next();
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function validateUser(userId: string): Promise<JwtPayload | null> {
  const user = await store.getUserById(userId);
  if (!user) return null;
  return { userId: user.id, tenantId: user.tenant_id, role: user.role };
}
