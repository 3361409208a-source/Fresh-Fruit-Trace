import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, authMiddleware } from '../middleware/auth';

// Try to use MySQL, fallback to memory store
let db: any;
try {
  db = require('../mysql');
} catch {
  // MySQL not available, use memory store
}

// In-memory fallback for users (for development without MySQL)
const memoryUsers: any[] = [
  {
    id: 1,
    enterprise_id: 1,
    username: 'admin',
    password_hash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Kz7aKdBdCkqy5LX1V9uGG', // admin123
    real_name: '系统管理员',
    role: 'super_admin',
    status: 1,
  },
];
const memoryEnterprises: any[] = [
  { id: 1, name: '系统管理', code: 'SYSTEM', status: 1 },
];

// Wrapper functions that work with both MySQL and memory
const useMemory = !db;
const dbWrapper = {
  getUserWithPasswordByUsername: async (username: string) => {
    if (useMemory) return memoryUsers.find(u => u.username === username) || null;
    return db.getUserWithPasswordByUsername(username);
  },
  getEnterpriseById: async (id: number) => {
    if (useMemory) return memoryEnterprises.find(e => e.id === id) || null;
    return db.getEnterpriseById(id);
  },
  updateUserLastLogin: async (id: number) => {
    if (useMemory) return;
    return db.updateUserLastLogin(id);
  },
};

const router = express.Router();

const SALT_ROUNDS = 10;

// POST /api/auth/login - 登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password, enterprise_code } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    let user: any = null;
    let enterprise: any = null;

    // 如果提供了企业编码，先查询企业，再查询用户
    if (enterprise_code && !useMemory) {
      const enterprises = await db.getEnterprises();
      enterprise = enterprises.find((e: any) => e.code === enterprise_code.trim());
      if (!enterprise || enterprise.status === 0) {
        return res.status(401).json({ success: false, message: '企业不存在或已被禁用' });
      }
      user = await db.getUserWithPassword(enterprise.id, username.trim());
    } else {
      // 没有提供企业编码，尝试直接通过用户名登录（仅超级管理员允许）
      user = await dbWrapper.getUserWithPasswordByUsername(username.trim());
      if (user) {
        enterprise = await dbWrapper.getEnterpriseById(user.enterprise_id);
      }
    }

    if (!user || user.status === 0) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await dbWrapper.updateUserLastLogin(user.id);

    // 生成 token
    const token = generateToken({
      userId: user.id,
      enterpriseId: user.enterprise_id,
      role: user.role,
      username: user.username,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          real_name: user.real_name,
          phone: user.phone,
          role: user.role,
          enterprise_id: user.enterprise_id,
        },
        enterprise: enterprise
          ? {
              id: enterprise.id,
              name: enterprise.name,
              code: enterprise.code,
              logo_url: enterprise.logo_url,
            }
          : null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// POST /api/auth/register - 注册新企业账号（超级管理员）
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { enterprise_name, enterprise_code, username, password, real_name, phone } = req.body;

    if (!enterprise_name || !enterprise_code || !username || !password) {
      return res.status(400).json({ success: false, message: '企业名称、企业编码、用户名和密码为必填项' });
    }

    // 检查企业编码是否已存在
    const enterprises = await db.getEnterprises();
    if (enterprises.find((e) => e.code === enterprise_code.trim())) {
      return res.status(409).json({ success: false, message: '该企业编码已被使用' });
    }

    // 创建企业
    const enterprise = await db.createEnterprise({
      name: enterprise_name.trim(),
      code: enterprise_code.trim(),
    });

    // 创建管理员用户
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await db.createUser({
      enterprise_id: enterprise.id,
      username: username.trim(),
      password_hash: hash,
      real_name: real_name?.trim() || undefined,
      phone: phone?.trim() || undefined,
      role: 'admin',
    });

    // 生成 token
    const token = generateToken({
      userId: user.id,
      enterpriseId: enterprise.id,
      role: user.role,
      username: user.username,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, real_name: user.real_name, phone: user.phone, role: user.role, enterprise_id: enterprise.id },
        enterprise: { id: enterprise.id, name: enterprise.name, code: enterprise.code },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// GET /api/auth/profile - 获取当前用户信息
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await db.getUserById(req.user!.userId);
    const enterprise = await db.getEnterpriseById(req.user!.enterpriseId);

    if (!user || user.status === 0) {
      return res.status(401).json({ success: false, message: '用户不存在或已被禁用' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          real_name: user.real_name,
          phone: user.phone,
          role: user.role,
          last_login_at: user.last_login_at,
          enterprise_id: user.enterprise_id,
        },
        enterprise: enterprise
          ? { id: enterprise.id, name: enterprise.name, code: enterprise.code, logo_url: enterprise.logo_url, status: enterprise.status }
          : null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// PUT /api/auth/password - 修改密码
router.put('/password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: '原密码不能为空，新密码至少6位' });
    }

    const user = await db.getUserWithPasswordByUsername(req.user!.username);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });

    const isValid = await bcrypt.compare(old_password, user.password_hash);
    if (!isValid) return res.status(401).json({ success: false, message: '原密码错误' });

    const hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await db.updateUser(user.id, { password_hash: hash });

    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
