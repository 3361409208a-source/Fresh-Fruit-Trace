import express, { Request, Response } from 'express';
import store from '../db';

const router = express.Router();

// 获取所有产品类型
router.get('/', (_req: Request, res: Response) => {
  try {
    const types = store.getProducts().sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    res.json({ success: true, data: types });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 添加产品类型
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, default_shelf_hours } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '产品名称不能为空' });
    const list = store.getProducts();
    if (list.find(p => p.name === name.trim())) {
      return res.status(409).json({ success: false, message: '该产品类型已存在' });
    }
    const newId = list.length > 0 ? Math.max(...list.map(p => p.id)) + 1 : 1;
    const created = { id: newId, name: name.trim(), default_shelf_hours: default_shelf_hours || 24, created_at: Math.floor(Date.now() / 1000) };
    list.push(created);
    store.saveProducts(list);
    res.json({ success: true, data: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 更新产品类型
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { name, default_shelf_hours } = req.body;
    const list = store.getProducts();
    const idx = list.findIndex(p => String(p.id) === req.params.id);
    if (idx < 0) return res.status(404).json({ success: false, message: '未找到该产品类型' });
    list[idx] = { ...list[idx], name, default_shelf_hours };
    store.saveProducts(list);
    res.json({ success: true, data: list[idx] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 删除产品类型
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const list = store.getProducts().filter(p => String(p.id) !== req.params.id);
    store.saveProducts(list);
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
