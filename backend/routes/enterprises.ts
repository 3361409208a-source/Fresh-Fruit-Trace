import express, { Request, Response } from 'express';
import { authMiddleware, requireSuperAdmin, requireAdminOrSuper } from '../middleware/auth';
import * as db from '../mysql';

const router = express.Router();

// 所有路由需要认证
router.use(authMiddleware);

// GET /api/enterprises - 获取企业列表（超级管理员可查看所有，普通管理员仅看自己的）
router.get('/', async (req, res) => {
  try {
    const user = req.user!;

    if (user.role === 'super_admin') {
      const list = await db.getEnterprises();
      return res.json({ success: true, data: list });
    }

    // 普通用户只能看到自己的企业
    const enterprise = await db.getEnterpriseById(user.enterpriseId);
    if (!enterprise) return res.json({ success: true, data: [] });
    return res.json({ success: true, data: [enterprise] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// GET /api/enterprises/:id - 获取单个企业详情
router.get('/:id', requireAdminOrSuper, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = req.user!;

    if (user.role !== 'super_admin' && user.enterpriseId !== id) {
      return res.status(403).json({ success: false, message: '无权访问该企业信息' });
    }

    const enterprise = await db.getEnterpriseById(id);
    if (!enterprise) return res.status(404).json({ success: false, message: '企业不存在' });

    res.json({ success: true, data: enterprise });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// POST /api/enterprises - 创建企业（仅超级管理员）
router.post('/', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, code, contact_person, contact_phone, address, license_no } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: '企业名称和编码为必填项' });
    }

    const enterprises = await db.getEnterprises();
    if (enterprises.find((e) => e.code === code.trim())) {
      return res.status(409).json({ success: false, message: '企业编码已存在' });
    }

    const created = await db.createEnterprise({
      name: name.trim(),
      code: code.trim(),
      contact_person: contact_person?.trim(),
      contact_phone: contact_phone?.trim(),
      address: address?.trim(),
      license_no: license_no?.trim(),
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// PUT /api/enterprises/:id - 更新企业信息
router.put('/:id', requireAdminOrSuper, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = req.user!;

    if (user.role !== 'super_admin' && user.enterpriseId !== id) {
      return res.status(403).json({ success: false, message: '无权修改该企业信息' });
    }

    const enterprise = await db.getEnterpriseById(id);
    if (!enterprise) return res.status(404).json({ success: false, message: '企业不存在' });

    const { name, contact_person, contact_phone, address, license_no, logo_url, status } = req.body;
    await db.updateEnterprise(id, {
      name: name?.trim(),
      contact_person: contact_person?.trim(),
      contact_phone: contact_phone?.trim(),
      address: address?.trim(),
      license_no: license_no?.trim(),
      logo_url: logo_url?.trim(),
      status: status !== undefined ? parseInt(status) : undefined,
    });

    const updated = await db.getEnterpriseById(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// PUT /api/enterprises/:id/status - 启用/禁用企业
router.put('/:id/status', requireSuperAdmin, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (status !== 0 && status !== 1) {
      return res.status(400).json({ success: false, message: 'status 必须为 0 或 1' });
    }

    await db.updateEnterprise(id, { status });
    res.json({ success: true, message: status === 1 ? '企业已启用' : '企业已禁用' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
