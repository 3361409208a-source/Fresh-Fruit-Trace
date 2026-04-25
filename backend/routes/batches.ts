import express, { Request, Response } from 'express';
import store from '../db';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// 配置视频上传
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${req.params.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okMime = file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream';
    const okExt  = /\.(webm|mp4|ogg|mov)$/i.test(file.originalname);
    cb(null, okMime || okExt);
  }
});

// 今日统计（租户隔离）
router.get('/stats/today', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const stats = await store.getTodayStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 获取批次列表（租户隔离）
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, product_name, date, page = '1', limit = '20' } = req.query as Record<string, string | undefined>;

    const result = await store.getBatches(tenantId, {
      status,
      product_name,
      date,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    // 附加 default_shelf_hours
    const products = await store.getProducts(tenantId);
    const data = result.data.map(b => {
      const pt = products.find(p => p.id === b.product_type_id);
      return { ...b, default_shelf_hours: pt ? pt.default_shelf_hours : null };
    });

    res.json({ success: true, data, total: result.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 获取单个批次（租户隔离）
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = String(req.params.id);
    const batch = await store.getBatchById(tenantId, id);
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });
    const events = await store.getEventsByBatch(tenantId, id);
    res.json({ success: true, data: { ...batch, events } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 创建批次（租户隔离）
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { product_name, product_type_id, operator, weight, spec, notes, latitude, longitude, location_name } = req.body;
    if (!product_name || !operator) {
      return res.status(400).json({ success: false, message: '产品名称和操作员不能为空' });
    }
    const now = Math.floor(Date.now() / 1000);
    const batch = await store.createBatch(tenantId, {
      product_name,
      product_type_id: product_type_id ? parseInt(product_type_id) : null,
      operator,
      weight: weight ? parseFloat(weight) : null,
      spec: spec || '',
      notes: notes || '',
      status: 'preparing',
      started_at: now,
      ended_at: null,
      production_time: null,
      expire_at: null,
      video_path: null,
      video_url: null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      location_name: location_name || null,
    });
    await store.addEvent(tenantId, batch.id, 'created', `批次创建：${product_name} - 操作员：${operator}`);
    res.json({ success: true, data: batch });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 更新批次状态/信息（租户隔离）
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = String(req.params.id);
    const batch = await store.getBatchById(tenantId, id);
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });

    const { status, weight, spec, notes, expire_at, production_time, product_name, operator, latitude, longitude, location_name } = req.body;
    const now = Math.floor(Date.now() / 1000);
    const updates: Partial<import('../types').Batch> = {};

    if (status !== undefined) updates.status = status;
    if (weight !== undefined) updates.weight = weight;
    if (spec !== undefined) updates.spec = spec;
    if (notes !== undefined) updates.notes = notes;
    if (expire_at !== undefined) updates.expire_at = expire_at;
    if (production_time !== undefined) updates.production_time = production_time;
    if (product_name !== undefined) updates.product_name = product_name;
    if (operator !== undefined) updates.operator = operator;
    if (latitude !== undefined) updates.latitude = latitude;
    if (longitude !== undefined) updates.longitude = longitude;
    if (location_name !== undefined) updates.location_name = location_name;

    if (status === 'recording') {
      updates.started_at = now;
      await store.addEvent(tenantId, id, 'recording_started', '开始录制生产过程');
    } else if (status === 'done') {
      updates.ended_at = now;
      if (!batch.production_time) updates.production_time = now;
      await store.addEvent(tenantId, id, 'production_done', '生产完成，停止录制');
    } else if (status === 'printed') {
      await store.addEvent(tenantId, id, 'label_printed', '标签已打印');
    }

    const updated = await store.updateBatch(tenantId, id, updates);
    res.json({ success: true, data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 上传视频（租户隔离）
router.post('/:id/video', authMiddleware, upload.single('video'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = String(req.params.id);

    if (!req.file) {
      return res.status(400).json({ success: false, message: '未收到视频文件' });
    }

    const batch = await store.getBatchById(tenantId, id);
    if (!batch) {
      return res.status(404).json({ success: false, message: '批次不存在' });
    }

    const videoUrl = `/uploads/${req.file.filename}`;
    await store.updateBatch(tenantId, id, { video_path: req.file.path, video_url: videoUrl });
    await store.addEvent(tenantId, id, 'video_uploaded', `视频已上传：${req.file.filename}`);
    res.json({ success: true, video_url: videoUrl, filename: req.file.filename, size: req.file.size });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// 删除批次（租户隔离）
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = String(req.params.id);
    const batch = await store.getBatchById(tenantId, id);
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });
    if (batch.video_path && fs.existsSync(batch.video_path)) fs.unlinkSync(batch.video_path);
    await store.deleteEventsByBatch(tenantId, id);
    await store.deleteBatch(tenantId, id);
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
