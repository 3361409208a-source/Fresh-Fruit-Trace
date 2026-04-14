# 🚀 一键启动指南

## 快速开始

### 方式一：双击启动（推荐）
双击项目根目录的 `start.bat` 文件

### 方式二：命令行启动
```powershell
# PowerShell 执行
.\start-all.ps1

# 或带参数执行
.\start-all.ps1 -Install    # 安装依赖
.\start-all.ps1 -Status     # 查看状态
.\start-all.ps1 -Stop       # 停止服务
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `start.bat` | 一键启动前后端 |
| `.\start-all.ps1 -Install` | 安装所有依赖 |
| `.\start-all.ps1 -Status` | 查看服务状态 |
| `.\start-all.ps1 -Stop` | 停止所有服务 |

## 访问地址

- **管理后台**: http://localhost:3000
- **API 接口**: http://localhost:3001
- **公开溯源**: http://localhost:3000/trace/{批次ID}

## 默认账号

- **超级管理员**: `admin` / `admin123`（企业编码可不填）

## 手动启动（备用）

如果一键脚本无法使用，可以手动分别启动：

```bash
# 终端 1 - 后端
cd backend
npm run dev

# 终端 2 - 前端
cd frontend
npm start
```

## 故障排查

### MySQL 连接失败
1. 确保 MySQL 服务已启动
2. 检查 `backend/mysql.ts` 中的密码配置
3. 默认密码：`123456`

### 端口被占用
- 后端默认端口：`3001`
- 前端默认端口：`3000`
- 修改占用端口或终止占用进程
