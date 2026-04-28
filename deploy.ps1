# 基金从业资格题库 - 自动部署脚本 (PowerShell)
# 使用 Surge.sh 免费部署

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   基金从业资格题库 - 自动部署工具" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
Write-Host "[1/4] 检查 Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "✓ Node.js 已安装: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 未检测到 Node.js，请先安装" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org/zh-cn/download/" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}
Write-Host ""

# 检查/安装 Surge
Write-Host "[2/4] 检查 Surge 部署工具..." -ForegroundColor Yellow
try {
    $surgeVersion = surge -v
    Write-Host "✓ Surge 已安装: $surgeVersion" -ForegroundColor Green
} catch {
    Write-Host "正在安装 Surge..." -ForegroundColor Yellow
    npm install -g surge
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Surge 安装失败" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
    Write-Host "✓ Surge 安装成功" -ForegroundColor Green
}
Write-Host ""

# 准备部署
Write-Host "[3/4] 准备部署..." -ForegroundColor Yellow
$projectPath = Get-Location
Write-Host "项目目录: $projectPath" -ForegroundColor Gray
Write-Host ""

# 部署
Write-Host "[4/4] 开始部署到 Surge.sh..." -ForegroundColor Yellow
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "提示：首次部署需要输入邮箱和密码" -ForegroundColor Yellow
Write-Host "邮箱可以是任意格式，如: your@email.com" -ForegroundColor Yellow
Write-Host "密码任意设置，记住即可" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 执行部署
surge --project . --domain fund-exam-bank-$(Get-Random -Minimum 1000 -Maximum 9999).surge.sh

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "           部署成功！" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "提示：" -ForegroundColor Yellow
    Write-Host "- 首次访问可能需要等待 1-2 分钟" -ForegroundColor Gray
    Write-Host "- 所有数据保存在浏览器本地" -ForegroundColor Gray
    Write-Host "- 可以将链接分享给朋友使用" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "           部署失败" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能原因：" -ForegroundColor Yellow
    Write-Host "- 网络连接问题" -ForegroundColor Gray
    Write-Host "- 域名已被占用（重新运行脚本会生成新域名）" -ForegroundColor Gray
}

Write-Host ""
Read-Host "按回车键退出"