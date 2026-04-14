import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware, requireAdminOrSuper, requireSuperAdmin } from '../middleware/auth';
import * as db from '../mysql';
import type { UserRole } from '../types';

const router = express.Router();
const SALT_ROUNDS = 10;

router.use(authMiddleware);

// GET /api/users - 获取用户列表
router.get('/', requireAdminOrSuper, async (req, res) => {
  try {
    const user = req.user!;
    let enterpriseId = user.enterpriseId;

    // 超级管理员可以通过参数查看特定企业的用户
    if (user.role === 'super_admin' && req.query.enterprise_id) {
      enterpriseId = parseInt(req.query.enterprise_id as string);
    }

    const list = await db.getUsers(enterpriseId);
    res.json({ success: true, data: list });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// GET /api/users/:id - 获取单个用户详情
router.get('/:id', requireAdminOrSuper, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = req.user!;
    const target = await db.getUserById(id);

    if (!target) return res.status(404).json({ success: false, message: '用户不存在' });

    // 权限检查
    if (user.role !== 'super_admin' && target.enterprise_id !== user.enterpriseId) {
      return res.status(403).json({ success: false, message: '无权访问该用户信息' });
    }

    res.json({ success: true, data: target });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// POST /api/users - 创建用户
router.post('/', requireAdminOrSuper, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { username, password, real_name, phone, role, enterprise_id } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码为必填项' });
    }

    let targetEnterpriseId = user.enterpriseId;

    // 超级管理员可以为其他企业创建用户
    if (user.role === 'super_admin' && enterprise_id) {
      targetEnterpriseId = parseInt(enterprise_id);
    }

    // 权限检查：不能创建比自己更高权限的用户
    const newRole: UserRole = role || 'operator';
    if (user.role !== 'super_admin') {
      const roleLevels = { operator: 0, manager: 1, admin: 2, super_admin: 3 };
      if (roleLevels[newRole] >= roleLevels[user.role]) {
        return res.status(403).json({ success: false, message: '无法创建权限高于或等于自己的用户' });
      }
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const created = await db.createUser({
      enterprise_id: targetEnterpriseId,
      username: username.trim(),
      password_hash: hash,
      real_name: real_name?.trim(),
      phone: phone?.trim(),
      role: newRole,
    });

    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: '用户名在该企业中已存在' });
    }
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// PUT /api/users/:id - 更新用户信息
router.put('/:id', requireAdminOrSuper, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = req.user!;
    const target = await db.getUserById(id);

    if (!target) return res.status(404).json({ success: false, message: '用户不存在' });

    // 权限检查
    if (user.role !== 'super_admin' && target.enterprise_id !== user.enterpriseId) {
      return res.status(403).json({ success: false, message: '无权修改该用户信息' });
    }

    // 不能修改自己的企业归属
    if (target.id === user.userId && req.body.enterprise_id !== undefined) {
      return res.status(403).json({ success: false, message: '无法修改自己的企业归属' });
    }

    const { real_name, phone, role, status, password } = req.body;

    // 权限检查：不能提升用户权限超过自己
    if (role && role !== target.role) {
      if (user.role !== 'super_admin') {
        const roleLevels = { operator: 0, manager: 1, admin: 2, super_admin: 3 };
        if (roleLevels[role as UserRole] >= roleLevels[user.role]) {
          return res.status(403).json({ success: false, message: '无法将用户权限提升到高于或等于自己的级别' });
        }
      }
    }

    const updates: any = {};
    if (real_name !== undefined) updates.real_name = real_name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = parseInt(status);
    if (password) updates.password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    await db.updateUser(id, updates);

    const updated = await db.getUserById(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// PUT /api/users/:id/status - 启用/禁用用户
router.put('/:id/status', requireAdminOrSuper, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = req.user!;
    const { status } = req.body;

    if (status !== 0 && status !== 1) {
      return res.status(400).json({ success: false, message: 'status 必须为 0 或 1' });
    }

    const target = await db.getUserById(id);
    if (!target) return res.status(404).json({ success: false, message: '用户不存在' });

    // 不能禁用自己
    if (target.id === user.userId) {
      return res.status(403).json({ success: false, message: '无法禁用自己的账号' });
    }

    // 权限检查
    if (user.role !== 'super_admin' && target.enterprise_id !== user.enterpriseId) {
      return res.status(403).json({ success: false, message: '无权修改该用户状态' });
    }

    await db.updateUser(id, { status });
    res.json({ success: true, message: status === 1 ? '用户已启用' : '用户已禁用' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// DELETE /api/users/:id - 删除用户
router.delete('/:id', requireAdminOrSuper, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = req.user!;
    const target = await db.getUserById(id);

    if (!target) return res.status(404).json({ success: false, message: '用户不存在' });

    // 不能删除自己
    if (target.id === user.userId) {
      return res.status(403).json({ success: false, message: '无法删除自己的账号' });
    }

    // 权限检查
    if (user.role !== 'super_admin' && target.enterprise_id !== user.enterpriseId) {
      return res.status(403).json({ success: false, message: '无权删除该用户' });
    }

    // 权限检查：不能删除权限更高的用户
    if (user.role !== 'super_admin') {
      const roleLevels = { operator: 0, manager: 1, admin: 2, super_admin: 3 };
      if (roleLevels[target.role] > roleLevels[user.role]) {
        return res.status(403).json({ success: false, message: '无法删除权限高于自己的用户' });
      }
    }

    await db.deleteUser(id);
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
