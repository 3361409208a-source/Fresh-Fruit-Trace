import express, { Request, Response } from 'express';
import * as db from '../mysql';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// 所有批次路由需要认证
router.use(authMiddleware);

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

// GET /api/batches/stats/today - 今日统计
router.get('/stats/today', async (_req: Request, res: Response) => {
  try {
    const enterpriseId = _req.user!.enterpriseId;
    const stats = await db.getTodayStats(enterpriseId);
    res.json({ success: true, data: stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// GET /api/batches - 获取批次列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const enterpriseId = req.user!.enterpriseId;
    const { status, product_name, date, page = '1', limit = '20' } = req.query as Record<string, string | undefined>;

    const limitNum = parseInt(limit) || 20;
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;

    const { batches, total } = await db.getBatches(enterpriseId, {
      status,
      product_name,
      date,
      limit: limitNum,
      offset,
    });

    // 获取产品类型信息以填充默认保质期
    const products = await db.getProducts(enterpriseId);
    const enriched = batches.map((b) => {
      const pt = products.find((p) => p.id === b.product_type_id);
      return { ...b, default_shelf_hours: pt ? pt.default_shelf_hours : null };
    });

    res.json({ success: true, data: enriched, total, page: pageNum, limit: limitNum });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// GET /api/batches/:id - 获取单个批次
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const enterpriseId = req.user!.enterpriseId;
    const { id } = req.params;
    const batch = await db.getBatchById(id, enterpriseId);
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });
    const events = await db.getEventsByBatch(id, enterpriseId);
    res.json({ success: true, data: { ...batch, events } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// POST /api/batches - 创建批次
router.post('/', async (req: Request, res: Response) => {
  try {
    const enterpriseId = req.user!.enterpriseId;
    const { product_name, product_type_id, operator, weight, spec, notes, latitude, longitude, location_name } = req.body;
    if (!product_name || !operator) {
      return res.status(400).json({ success: false, message: '产品名称和操作员不能为空' });
    }

    const batchId = uuidv4();
    const batch = await db.createBatch({
      id: batchId,
      enterprise_id: enterpriseId,
      product_name,
      product_type_id: product_type_id ? parseInt(product_type_id) : null,
      operator,
      weight: weight ? parseFloat(weight) : null,
      spec: spec || '',
      notes: notes || '',
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      location_name: location_name || null,
    });

    await db.addEvent({ batch_id: batch.id, enterprise_id: enterpriseId, event_type: 'created', description: `批次创建：${product_name} - 操作员：${operator}` });
    res.json({ success: true, data: batch });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// PUT /api/batches/:id - 更新批次状态/信息
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const enterpriseId = req.user!.enterpriseId;
    const { id } = req.params;
    const batch = await db.getBatchById(id, enterpriseId);
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });

    const { status, weight, spec, notes, expire_at, production_time, product_name, operator, latitude, longitude, location_name } = req.body;
    const now = Math.floor(Date.now() / 1000);
    const updates: any = {};

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
      await db.addEvent({ batch_id: id, enterprise_id: enterpriseId, event_type: 'recording_started', description: '开始录制生产过程' });
    } else if (status === 'done') {
      updates.ended_at = now;
      if (!batch.production_time) updates.production_time = now;
      await db.addEvent({ batch_id: id, enterprise_id: enterpriseId, event_type: 'production_done', description: '生产完成，停止录制' });
    } else if (status === 'printed') {
      await db.addEvent({ batch_id: id, enterprise_id: enterpriseId, event_type: 'label_printed', description: '标签已打印' });
    }

    await db.updateBatch(id, enterpriseId, updates);
    const updated = await db.getBatchById(id, enterpriseId);
    res.json({ success: true, data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// POST /api/batches/:id/video - 上传视频
router.post('/:id/video', upload.single('video'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    const enterpriseId = req.user!.enterpriseId;
    const { id } = req.params;
    console.log('[DEBUG] Upload attempt for batch:', id);
    console.log('[DEBUG] req.file:', req.file);

    if (!req.file) {
      console.log('[DEBUG] No file received!');
      return res.status(400).json({ success: false, message: '未收到视频文件' });
    }

    const batch = await db.getBatchById(id, enterpriseId);
    if (!batch) {
      console.log('[DEBUG] Batch not found:', id);
      return res.status(404).json({ success: false, message: '批次不存在' });
    }

    const videoUrl = `/uploads/${req.file.filename}`;
    await db.updateBatch(id, enterpriseId, { video_path: req.file.path, video_url: videoUrl });
    await db.addEvent({ batch_id: id, enterprise_id: enterpriseId, event_type: 'video_uploaded', description: `视频已上传：${req.file.filename}` });
    res.json({ success: true, video_url: videoUrl, filename: req.file.filename, size: req.file.size });
  } catch (err) {
    console.error('[DEBUG] Upload error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

// DELETE /api/batches/:id - 删除批次
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const enterpriseId = req.user!.enterpriseId;
    const { id } = req.params;
    const batch = await db.getBatchById(id, enterpriseId);
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });
    if (batch.video_path && fs.existsSync(batch.video_path)) fs.unlinkSync(batch.video_path);
    await db.deleteEventsByBatch(id, enterpriseId);
    await db.deleteBatch(id, enterpriseId);
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
