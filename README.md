# 鲜切水果全程追溯系统

## 快速启动

### 1. 启动后端
```bash
cd backend
npm install
node server.js
```
后端运行在 http://localhost:3001

### 2. 启动前端
```bash
cd frontend
npm install
npm start
```
前端运行在 http://localhost:3000

---

## 功能说明

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
food/
├── backend/        # Node.js + Express + SQLite
│   ├── routes/     # API路由
│   ├── uploads/    # 视频文件存储
│   ├── data/       # SQLite数据库文件
│   └── server.js
└── frontend/       # React + TailwindCSS
    └── src/
        ├── pages/  # 页面组件
        └── api.js  # API封装
```
