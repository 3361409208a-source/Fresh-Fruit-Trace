const express = require('express');
const router = express.Router();
const store = require('../db');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置视频上传
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${req.params.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okMime = file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream';
    const okExt  = /\.(webm|mp4|ogg|mov)$/i.test(file.originalname);
    cb(null, okMime || okExt);
  }
});

// 今日统计（必须在 /:id 之前注册，防止被误匹配）
router.get('/stats/today', (req, res) => {
  try {
    res.json({ success: true, data: store.getTodayStats() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取批次列表
router.get('/', (req, res) => {
  try {
    const { status, product_name, date, page = 1, limit = 20 } = req.query;
    const products = store.getProducts();
    let list = store.getBatches();

    if (status) list = list.filter(b => b.status === status);
    if (product_name) list = list.filter(b => b.product_name && b.product_name.includes(product_name));
    if (date) {
      const start = Math.floor(new Date(date).getTime() / 1000);
      list = list.filter(b => b.created_at >= start && b.created_at < start + 86400);
    }

    list = list.sort((a, b) => b.created_at - a.created_at);
    const total = list.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paged = list.slice(offset, offset + parseInt(limit)).map(b => {
      const pt = products.find(p => p.id === b.product_type_id);
      return { ...b, default_shelf_hours: pt ? pt.default_shelf_hours : null };
    });

    res.json({ success: true, data: paged, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取单个批次
router.get('/:id', (req, res) => {
  try {
    const batch = store.getBatchById(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });
    const events = store.getEventsByBatch(req.params.id);
    res.json({ success: true, data: { ...batch, events } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 创建批次
router.post('/', (req, res) => {
  try {
    const { product_name, product_type_id, operator, weight, spec, notes } = req.body;
    if (!product_name || !operator) {
      return res.status(400).json({ success: false, message: '产品名称和操作员不能为空' });
    }
    const now = Math.floor(Date.now() / 1000);
    const batch = {
      id: uuidv4(),
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
      created_at: now,
    };
    store.upsertBatch(batch);
    store.addEvent(batch.id, 'created', `批次创建：${product_name} - 操作员：${operator}`);
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新批次状态/信息
router.put('/:id', (req, res) => {
  try {
    const batch = store.getBatchById(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });

    const { status, weight, spec, notes, expire_at, production_time, product_name, operator } = req.body;
    const now = Math.floor(Date.now() / 1000);
    const updated = { ...batch };

    if (status !== undefined) updated.status = status;
    if (weight !== undefined) updated.weight = weight;
    if (spec !== undefined) updated.spec = spec;
    if (notes !== undefined) updated.notes = notes;
    if (expire_at !== undefined) updated.expire_at = expire_at;
    if (production_time !== undefined) updated.production_time = production_time;
    if (product_name !== undefined) updated.product_name = product_name;
    if (operator !== undefined) updated.operator = operator;

    if (status === 'recording') {
      updated.started_at = now;
      store.addEvent(req.params.id, 'recording_started', '开始录制生产过程');
    } else if (status === 'done') {
      updated.ended_at = now;
      if (!batch.production_time) updated.production_time = now;
      store.addEvent(req.params.id, 'production_done', '生产完成，停止录制');
    } else if (status === 'printed') {
      store.addEvent(req.params.id, 'label_printed', '标签已打印');
    }

    store.upsertBatch(updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 上传视频
router.post('/:id/video', upload.single('video'), (req, res) => {
  try {
    console.log('[DEBUG] Upload attempt for batch:', req.params.id);
    console.log('[DEBUG] req.file:', req.file);
    console.log('[DEBUG] req.body:', req.body);

    if (!req.file) {
      console.log('[DEBUG] No file received!');
      return res.status(400).json({ success: false, message: '未收到视频文件' });
    }

    console.log('[DEBUG] File received - size:', req.file.size, 'mimetype:', req.file.mimetype, 'originalname:', req.file.originalname);

    const batch = store.getBatchById(req.params.id);
    if (!batch) {
      console.log('[DEBUG] Batch not found:', req.params.id);
      return res.status(404).json({ success: false, message: '批次不存在' });
    }

    // Check actual file on disk
    const fs = require('fs');
    const stats = fs.statSync(req.file.path);
    console.log('[DEBUG] Disk file size:', stats.size, 'bytes');

    const videoUrl = `/uploads/${req.file.filename}`;
    store.upsertBatch({ ...batch, video_path: req.file.path, video_url: videoUrl });
    store.addEvent(req.params.id, 'video_uploaded', `视频已上传：${req.file.filename}`);
    res.json({ success: true, video_url: videoUrl, filename: req.file.filename, size: req.file.size });
  } catch (err) {
    console.error('[DEBUG] Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除批次
router.delete('/:id', (req, res) => {
  try {
    const batch = store.getBatchById(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });
    if (batch.video_path && fs.existsSync(batch.video_path)) fs.unlinkSync(batch.video_path);
    store.deleteEventsByBatch(req.params.id);
    store.deleteBatch(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
