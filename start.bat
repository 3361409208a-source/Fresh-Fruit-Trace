@echo off
chcp 65001 >nul
echo ===========================================
echo   鲜切水果追溯系统 - 一键启动
echo ===========================================
echo.

:: 检查 PowerShell 执行策略
echo 正在启动...
echo.

:: 使用 PowerShell 运行脚本
powershell -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"

pause
