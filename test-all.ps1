# 客户标签系统 - 完整功能测试脚本 (PowerShell 版本)
# 用于验证后端 API 和前端页面是否正常

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🧪 客户标签系统 - 功能测试" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 测试结果统计
$TestsPassed = 0
$TestsFailed = 0

# 测试函数
function Test-API {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$Data = "{}"
    )
    
    Write-Host -NoNewline "测试 $Name ... "
    
    try {
        if ($Method -eq "POST") {
            $response = Invoke-RestMethod -Uri $Url -Method Post `
                -ContentType "application/json" -Body $Data `
                -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method Get `
                -ErrorAction Stop
        }
        
        Write-Host "✅ 通过" -ForegroundColor Green
        $script:TestsPassed++
        return $true
    } catch {
        Write-Host "❌ 失败 ($($_.Exception.Response.StatusCode))" -ForegroundColor Red
        Write-Host "错误：$($_.Exception.Message)"
        $script:TestsFailed++
        return $false
    }
}

Write-Host "📍 测试环境检查" -ForegroundColor Yellow
Write-Host "--------------------------------------"

# 检查后端服务
Write-Host -NoNewline "检查后端服务 (端口 3000) ... "
$backendPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($backendPort) {
    Write-Host "✅ 运行中" -ForegroundColor Green
} else {
    Write-Host "❌ 未运行" -ForegroundColor Red
    Write-Host "请先启动后端服务：npm run dev"
    exit 1
}

# 检查前端服务
Write-Host -NoNewline "检查前端服务 (端口 5176) ... "
$frontendPort = Get-NetTCPConnection -LocalPort 5176 -ErrorAction SilentlyContinue
if ($frontendPort) {
    Write-Host "✅ 运行中" -ForegroundColor Green
} else {
    Write-Host "❌ 未运行" -ForegroundColor Red
    Write-Host "请先启动前端服务：cd frontend; npm run dev"
    exit 1
}

Write-Host ""
Write-Host "📊 开始 API 测试" -ForegroundColor Yellow
Write-Host "--------------------------------------"

$BaseUrl = "http://localhost:3000/api/v1"

# 1. 健康检查
Test-API -Name "健康检查" -Url "$BaseUrl/health"

# 2. 客户列表
Test-API -Name "客户列表" -Url "$BaseUrl/customers?page=1&limit=5"

# 3. 客户统计
Test-API -Name "客户统计" -Url "$BaseUrl/customers/statistics"

# 4. RFM 分析列表
Test-API -Name "RFM 分析列表" -Url "$BaseUrl/customers/rfm-analysis" -Method POST -Data '{"page":1,"limit":5}'

# 5. RFM 统计汇总
Test-API -Name "RFM 统计汇总" -Url "$BaseUrl/customers/rfm-summary" -Method POST -Data '{}'

# 6. 高价值客户
Test-API -Name "高价值客户" -Url "$BaseUrl/customers/rfm-high-value" -Method POST -Data '{"limit":5}'

# 7. 特定细分客户（重要价值客户）
Test-API -Name "重要价值客户" -Url "$BaseUrl/customers/rfm-segment/重要价值客户" -Method POST -Data '{}'

# 8. 推荐列表
Test-API -Name "推荐列表" -Url "$BaseUrl/recommendations/customer/1?page=1&limit=5"

# 9. 规则列表
Test-API -Name "规则列表" -Url "$BaseUrl/rules"

# 10. 评分概览
Test-API -Name "评分概览" -Url "$BaseUrl/scores/stats/overview"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "📈 测试结果汇总" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "通过：$TestsPassed" -ForegroundColor Green
Write-Host "失败：$TestsFailed" -ForegroundColor Red
Write-Host "总计：$($TestsPassed + $TestsFailed)"
Write-Host ""

if ($TestsFailed -eq 0) {
    Write-Host "🎉 所有测试通过！" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ 后端 API 全部正常" -ForegroundColor Green
    Write-Host ""
    Write-Host "👉 现在请在浏览器中访问：" -ForegroundColor Yellow
    Write-Host "   http://localhost:5176" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 前端测试步骤：" -ForegroundColor Yellow
    Write-Host "   1. 清理浏览器缓存 (Ctrl+Shift+Delete)" -ForegroundColor White
    Write-Host "   2. 强制刷新页面 (Ctrl+F5)" -ForegroundColor White
    Write-Host "   3. 登录：business_user / Business123" -ForegroundColor White
    Write-Host "   4. 访问【客户管理】→【统计分析】" -ForegroundColor White
    Write-Host "   5. 确认饼图显示正常（非 undefined）" -ForegroundColor White
    Write-Host "   6. 访问【RFM 分析】确认数据正常" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠️  部分测试失败，请检查日志" -ForegroundColor Red
    exit 1
}
