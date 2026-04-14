import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, message: '请先登录' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
    return;
  }

  req.user = payload;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '请先登录' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: '权限不足' });
      return;
    }
    next();
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: '请先登录' });
    return;
  }
  if (req.user.role !== 'super_admin') {
    res.status(403).json({ success: false, message: '仅超级管理员可操作' });
    return;
  }
  next();
}

export function requireAdminOrSuper(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: '请先登录' });
    return;
  }
  if (!['super_admin', 'admin'].includes(req.user.role)) {
    res.status(403).json({ success: false, message: '仅管理员可操作' });
    return;
  }
  next();
}
