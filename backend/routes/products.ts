import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as db from '../mysql';

const router = express.Router();

router.use(authMiddleware);

// GET /api/products - 获取企业所有产品类型
router.get('/', async (req, res) => {
  try {
    const enterpriseId = req.user!.enterpriseId;
    const types = (await db.getProducts(enterpriseId)).sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    res.json({ success: true, data: types });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// POST /api/products - 添加产品类型
router.post('/', async (req: Request, res: Response) => {
  try {
    const enterpriseId = req.user!.enterpriseId;
    const { name, default_shelf_hours } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '产品名称不能为空' });

    const created = await db.createProduct({
      enterprise_id: enterpriseId,
      name: name.trim(),
      default_shelf_hours: default_shelf_hours ? parseInt(default_shelf_hours) : undefined,
    });
    res.json({ success: true, data: created });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: '该产品类型已存在' });
    }
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// PUT /api/products/:id - 更新产品类型
router.put('/:id', async (req: Request<{id: string}>, res: Response) => {
  try {
    const enterpriseId = req.user!.enterpriseId;
    const id = parseInt(req.params.id);
    const { name, default_shelf_hours } = req.body;

    const product = await db.getProductById(id, enterpriseId);
    if (!product) return res.status(404).json({ success: false, message: '未找到该产品类型' });

    await db.updateProduct(id, enterpriseId, {
      name: name?.trim(),
      default_shelf_hours: default_shelf_hours !== undefined ? parseInt(default_shelf_hours) : undefined,
    });

    const updated = await db.getProductById(id, enterpriseId);
    res.json({ success: true, data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// DELETE /api/products/:id - 删除产品类型
router.delete('/:id', async (req: Request<{id: string}>, res: Response) => {
  try {
    const enterpriseId = req.user!.enterpriseId;
    const id = parseInt(req.params.id);
    await db.deleteProduct(id, enterpriseId);
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
