import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import store from '../db';
import { generateToken, authMiddleware } from '../middleware/auth';

const router = express.Router();

// 注册 - 创建企业账号（同时创建租户和管理员用户）
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { company_name, contact_name, contact_phone, username, password, display_name } = req.body;

    if (!company_name || !username || !password) {
      return res.status(400).json({ success: false, message: '企业名称、用户名和密码不能为空' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度至少6位' });
    }

    // 检查用户名是否已存在
    const existing = await store.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ success: false, message: '该用户名已被注册' });
    }

    // 创建租户
    const tenant = await store.createTenant(company_name, contact_name || '', contact_phone || '');

    // 创建管理员用户
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await store.createUser(tenant.id, username, passwordHash, 'admin', display_name || username);

    // 为新租户初始化默认产品
    await store.seedProductsForTenant(tenant.id);

    // 生成 token
    const token = generateToken({ userId: user.id, tenantId: tenant.id, role: user.role });

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
        tenant: { id: tenant.id, name: tenant.name },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const user = await store.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const tenant = await store.getTenantById(user.tenant_id);
    const token = generateToken({ userId: user.id, tenantId: user.tenant_id, role: user.role });

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
        tenant: { id: tenant?.id, name: tenant?.name },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await store.getUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const tenant = await store.getTenantById(user.tenant_id);
    res.json({
      success: true,
      data: {
        user: { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
        tenant: { id: tenant?.id, name: tenant?.name },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
