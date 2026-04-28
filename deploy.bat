@echo off
chcp 65001 >nul
title 基金从业资格题库 - 自动部署工具
echo ==========================================
echo    基金从业资格题库 - 自动部署工具
echo ==========================================
echo.

REM 检查是否安装 Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/zh-cn/download/
    echo.
    pause
    exit /b 1
)

echo [1/4] 检查 Node.js 版本...
node -v
echo.

REM 检查是否安装 surge
surge -v >nul 2>&1
if errorlevel 1 (
    echo [2/4] 安装 Surge 部署工具...
    npm install -g surge
    if errorlevel 1 (
        echo [错误] Surge 安装失败
        pause
        exit /b 1
    )
) else (
    echo [2/4] Surge 已安装
)
echo.

echo [3/4] 准备部署...
echo 当前目录: %CD%
echo.

REM 创建 surge 配置文件（避免交互式输入）
echo {
echo   "project": "%CD%",
echo   "domain": ""
echo } > surge.json

echo [4/4] 开始部署到 Surge.sh...
echo.
echo ==========================================
echo 提示：首次部署需要输入邮箱和密码
echo 邮箱可以是任意格式，如: your@email.com
echo 密码任意设置，记住即可
echo ==========================================
echo.

REM 执行部署
surge --project . --domain fund-exam-bank.surge.sh

if errorlevel 1 (
    echo.
    echo [错误] 部署失败，请检查网络连接
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    部署成功！
echo ==========================================
echo.
echo 访问地址: https://fund-exam-bank.surge.sh
echo.
echo 提示：
echo - 首次访问可能需要等待 1-2 分钟
echo - 所有数据保存在浏览器本地
echo - 可以将链接分享给朋友使用
echo.
pause