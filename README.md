# 鲜切水果全程追溯系统

## 快速启动

### 1. 启动后端
```bash
cd backend
npm install
npm run dev
```
后端运行在 http://localhost:3001

### 2. 启动前端
```bash
cd frontend
npm install
npm start
```
前端运行在 http://localhost:3000

### 3. 注册企业账号
首次访问前端会跳转到登录页，点击"注册企业"创建账号，注册后自动登录。

---

## 功能说明

### 认证与多租户（v2.0 新增）
- **企业注册**：注册时自动创建租户和管理员账号
- **用户登录**：JWT Token 认证，7天有效期
- **租户隔离**：每个企业数据完全隔离，互不可见
- **角色权限**：admin（管理员）/ operator（操作员）

### 生产端（http://localhost:3000）
- **控制台**：今日批次统计概览
- **开始记录**：创建批次 → 摄像头录制 → 设置有效期 → 生成标签
- **批次管理**：查看所有批次，支持搜索/筛选/删除
- **打印标签**：自动生成含二维码的标签，支持浏览器打印

### 消费者端（扫码访问）
- 扫描标签上的二维码，手机浏览器直接打开
- 查看产品信息、有效期倒计时、生产过程视频
- 完整操作记录时间轴

---

## 目录结构
```
Fresh-Fruit-Trace/
├── backend/           # Node.js + Express + SQLite (sql.js)
│   ├── routes/        # API路由（auth, products, batches, trace）
│   ├── middleware/    # 认证中间件（JWT）
│   ├── uploads/       # 视频文件存储
│   ├── data/          # SQLite数据库文件
│   ├── db.ts          # 数据库操作层
│   ├── types.ts       # 类型定义
│   └── server.ts      # 入口文件
└── frontend/          # React + TailwindCSS
    └── src/
        ├── pages/     # 页面组件（含Login登录页）
        ├── api.ts     # API封装（含认证API）
        └── types.ts   # 类型定义
```
