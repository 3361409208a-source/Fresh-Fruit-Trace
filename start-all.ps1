# 鲜切水果追溯系统 - 一键启动脚本
# 同时启动后端和前端服务

param(
    [switch]$Install,
    [switch]$Stop,
    [switch]$Status
)

$ErrorActionPreference = "Stop"

# 颜色定义
$Green = "Green"
$Blue = "Cyan"
$Yellow = "Yellow"
$Red = "Red"

function Write-Info($msg) { Write-Host $msg -ForegroundColor $Blue }
function Write-Success($msg) { Write-Host $msg -ForegroundColor $Green }
function Write-Warn($msg) { Write-Host $msg -ForegroundColor $Yellow }
function Write-Error($msg) { Write-Host $msg -ForegroundColor $Red }

# 获取项目根目录
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

# 检查端口占用
function Test-Port($port) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return $connection -ne $null
}

# 检查 Node 进程
function Get-NodeProcesses {
    return Get-Process node -ErrorAction SilentlyContinue | Where-Object {
        $_.Path -like "*$RootDir*"
    }
}

# 状态检查
if ($Status) {
    Write-Info "=== 服务状态检查 ==="
    
    $backendRunning = Test-Port 3001
    $frontendRunning = Test-Port 3000
    $nodeProcesses = Get-NodeProcesses
    
    Write-Host ""
    Write-Host "后端服务 (localhost:3001): " -NoNewline
    if ($backendRunning) { Write-Success "运行中" } else { Write-Warn "未启动" }
    
    Write-Host "前端服务 (localhost:3000): " -NoNewline
    if ($frontendRunning) { Write-Success "运行中" } else { Write-Warn "未启动" }
    
    Write-Host "Node 进程数: " -NoNewline
    if ($nodeProcesses) { Write-Host $nodeProcesses.Count } else { Write-Host 0 }
    
    Write-Host ""
    Write-Info "访问地址:"
    Write-Host "  管理后台: http://localhost:3000"
    Write-Host "  API 文档: http://localhost:3001"
    Write-Host ""
    exit 0
}

# 停止服务
if ($Stop) {
    Write-Info "=== 停止所有服务 ==="
    
    # 查找并终止相关 Node 进程
    $processes = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
        $_.Path -like "*$RootDir*"
    }
    
    if ($processes) {
        $processes | ForEach-Object {
            Write-Warn "终止进程: $($_.Id)"
            Stop-Process -Id $_.Id -Force
        }
        Write-Success "所有服务已停止"
    } else {
        Write-Warn "未找到运行中的服务"
    }
    
    exit 0
}

# 安装依赖
if ($Install) {
    Write-Info "=== 安装依赖 ==="
    
    # 后端依赖
    Write-Host ""
    Write-Info "安装后端依赖..."
    Set-Location $BackendDir
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Error "后端依赖安装失败"; exit 1 }
    Write-Success "后端依赖安装完成"
    
    # 前端依赖
    Write-Host ""
    Write-Info "安装前端依赖..."
    Set-Location $FrontendDir
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Error "前端依赖安装失败"; exit 1 }
    Write-Success "前端依赖安装完成"
    
    Write-Host ""
    Write-Success "所有依赖安装完成！"
    exit 0
}

# 主启动流程
Write-Info "=== 鲜切水果追溯系统 - 一键启动 ==="
Write-Host ""

# 检查 MySQL
Write-Info "检查 MySQL 服务..."
try {
    $mysqlService = Get-Service MySQL* -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Running' }
    if (-not $mysqlService) {
        Write-Warn "MySQL 服务未运行，尝试启动..."
        Get-Service MySQL* | Start-Service
    }
    Write-Success "MySQL 服务正常"
} catch {
    Write-Warn "请确保 MySQL 服务已启动"
}

Write-Host ""

# 检查端口占用
if (Test-Port 3001) {
    Write-Warn "端口 3001 被占用，后端可能已在运行"
} else {
    Write-Info "启动后端服务 (localhost:3001)..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendDir'; npm run dev" -WindowStyle Normal
}

Start-Sleep -Seconds 3

if (Test-Port 3000) {
    Write-Warn "端口 3000 被占用，前端可能已在运行"
} else {
    Write-Info "启动前端服务 (localhost:3000)..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir'; npm start" -WindowStyle Normal
}

Write-Host ""
Write-Success "启动命令已发送！"
Write-Host ""
Write-Info "等待服务启动..."
Start-Sleep -Seconds 5

# 检查启动结果
$backendOk = Test-Port 3001
$frontendOk = Test-Port 3000

Write-Host ""
Write-Info "=== 启动状态 ==="
Write-Host "后端 (localhost:3001): " -NoNewline
if ($backendOk) { Write-Success "✅ 运行中" } else { Write-Warn "⏳ 启动中..." }

Write-Host "前端 (localhost:3000): " -NoNewline
if ($frontendOk) { Write-Success "✅ 运行中" } else { Write-Warn "⏳ 启动中..." }

Write-Host ""
Write-Info "访问地址:"
Write-Host "  管理后台: http://localhost:3000"
Write-Host "  API 接口: http://localhost:3001"
Write-Host ""
Write-Host "默认账号: admin / admin123"
Write-Host ""
Write-Info "Press Enter to close (services continue running)..."
Read-Host
