import express, { Request, Response } from 'express';
import store from '../db';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// 获取所有产品类型（租户隔离）
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const tenantId = _req.user!.tenantId;
    const types = await store.getProducts(tenantId);
    res.json({ success: true, data: types });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 添加产品类型
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { name, default_shelf_hours } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '产品名称不能为空' });
    const list = await store.getProducts(tenantId);
    if (list.find(p => p.name === name.trim())) {
      return res.status(409).json({ success: false, message: '该产品类型已存在' });
    }
    const created = await store.createProduct(tenantId, name.trim(), default_shelf_hours || 24);
    res.json({ success: true, data: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 更新产品类型
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { name, default_shelf_hours } = req.body;
    const updated = await store.updateProduct(tenantId, parseInt(String(req.params.id)), name, default_shelf_hours);
    if (!updated) return res.status(404).json({ success: false, message: '未找到该产品类型' });
    res.json({ success: true, data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 删除产品类型
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const ok = await store.deleteProduct(tenantId, parseInt(String(req.params.id)));
    if (!ok) return res.status(404).json({ success: false, message: '未找到该产品类型' });
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
