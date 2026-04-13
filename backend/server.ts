import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import productsRouter from './routes/products';
import batchesRouter from './routes/batches';
import traceRouter from './routes/trace';

const app = express();
const PORT = process.env.PORT || 3001;

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 中间件
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件 - 视频访问
app.use('/uploads', express.static(uploadsDir));

// API 路由 (同时支持 /api/xxx 和 /xxx，兼容代理 strip 前缀的情况)
app.use('/api/products', productsRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/trace', traceRouter);
app.use('/products', productsRouter);
app.use('/batches', batchesRouter);
app.use('/trace', traceRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: '鲜切水果追溯系统后端运行正常', timestamp: Date.now() });
});
app.get('/health', (_req, res) => {
  res.json({ success: true, message: '鲜切水果追溯系统后端运行正常', timestamp: Date.now() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ 后端服务已启动: http://localhost:${PORT}`);
  console.log(`📦 API文档:`);
  console.log(`   GET  /api/health         - 健康检查`);
  console.log(`   GET  /api/products       - 产品类型列表`);
  console.log(`   POST /api/products       - 添加产品类型`);
  console.log(`   GET  /api/batches        - 批次列表`);
  console.log(`   POST /api/batches        - 创建批次`);
  console.log(`   PUT  /api/batches/:id    - 更新批次`);
  console.log(`   POST /api/batches/:id/video - 上传视频`);
  console.log(`   GET  /api/trace/:id      - 公开溯源查询`);
});

export default app;
