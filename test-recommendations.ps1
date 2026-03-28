# 推荐结果管理功能 - API 自动化测试脚本 (PowerShell 版本)
# 使用方法：.\test-recommendations.ps1

$ErrorActionPreference = "Stop"

# 配置
$BASE_URL = "http://localhost:3000/api/v1"
$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0IiwidXNlcm5hbWUiOiJidXNpbmVzc191c2VyIiwicm9sZXMiOlsiYW5hbHlzdCIsInVzZXIiXSwiZW1haWwiOiJidXNpbmVzc0BleGFtcGxlLmNvbSIsImlhdCI6MTc3NDU5NTczMywiZXhwIjoxNzc0NTk5MzMzfQ.RHmnyFHj_0LAJK_ix5os_7PzJ60J9UGKyAnHdugTBxM"

# 计数器
$TOTAL = 0
$PASSED = 0
$FAILED = 0

# 打印函数
function Print-Test {
    param($message)
    Write-Host "[TEST] $message" -ForegroundColor Yellow
}

function Print-Pass {
    param($message)
    Write-Host "[PASS] $message" -ForegroundColor Green
    $script:PASSED++
    $script:TOTAL++
}

function Print-Fail {
    param($message)
    Write-Host "[FAIL] $message" -ForegroundColor Red
    $script:FAILED++
    $script:TOTAL++
}

function Print-Info {
    param($message)
    Write-Host "[INFO] $message" -ForegroundColor Cyan
}

# 测试函数
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Data,
        [int]$ExpectedStatus = 200
    )
    
    Print-Test "$Method $Endpoint"
    
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri "$BASE_URL$Endpoint" -Method Get -Headers $headers
        } elseif ($Method -eq "POST") {
            $response = Invoke-RestMethod -Uri "$BASE_URL$Endpoint" -Method Post -Headers $headers -Body $Data
        }
        
        Print-Pass "$Method $Endpoint (HTTP 200)"
        Write-Host "  Response: $($response | ConvertTo-Json -Depth 3 -Compress)" -ForegroundColor Gray
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Print-Pass "$Method $Endpoint (HTTP $statusCode)"
        } else {
            Print-Fail "$Method $Endpoint (Expected: $ExpectedStatus, Got: $statusCode)"
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# 主测试流程
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "推荐结果管理功能 - API 自动化测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 健康检查
Print-Info "阶段 1: 健康检查"
Test-Endpoint -Method "GET" -Endpoint "/health" -Data "" -ExpectedStatus 200
Write-Host ""

# 2. 基础查询测试
Print-Info "阶段 2: 基础查询测试"
Test-Endpoint -Method "GET" -Endpoint "/recommendations?page=1&limit=5" -Data "" -ExpectedStatus 200
Test-Endpoint -Method "GET" -Endpoint "/recommendations?category=偏好分析" -Data "" -ExpectedStatus 200
Test-Endpoint -Method "GET" -Endpoint "/recommendations?source=rule" -Data "" -ExpectedStatus 200
Test-Endpoint -Method "GET" -Endpoint "/recommendations?minConfidence=0.8" -Data "" -ExpectedStatus 200
Write-Host ""

# 3. 操作功能测试
Print-Info "阶段 3: 操作功能测试"
Test-Endpoint -Method "POST" -Endpoint "/recommendations/1/accept" -Data '{"feedbackReason":"自动化测试接受"}' -ExpectedStatus 200
Test-Endpoint -Method "POST" -Endpoint "/recommendations/2/reject" -Data '{"feedbackReason":"自动化测试拒绝"}' -ExpectedStatus 200
Write-Host ""

# 4. 批量操作测试
Print-Info "阶段 4: 批量操作测试"
Test-Endpoint -Method "POST" -Endpoint "/recommendations/batch-accept" -Data '{"ids":[3,4,5]}' -ExpectedStatus 200
Test-Endpoint -Method "POST" -Endpoint "/recommendations/batch-reject" -Data '{"ids":[6,7,8]}' -ExpectedStatus 200
Write-Host ""

# 5. 测试数据管理
Print-Info "阶段 5: 测试数据管理"
Test-Endpoint -Method "POST" -Endpoint "/recommendations/generate-test-data" -Data '{"count":10}' -ExpectedStatus 200
# 注意：清空测试数据需要谨慎，这里仅注释掉
# Test-Endpoint -Method "POST" -Endpoint "/recommendations/clear-test-data" -Data "" -ExpectedStatus 200
Write-Host ""

# 6. 统计信息
Print-Info "阶段 6: 统计信息查询"
Test-Endpoint -Method "GET" -Endpoint "/recommendations/stats" -Data "" -ExpectedStatus 200
Write-Host ""

# 总结
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试总结" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "总测试数：$TOTAL"
Write-Host "通过：$PASSED" -ForegroundColor Green
Write-Host "失败：$FAILED" -ForegroundColor Red
Write-Host ""

if ($FAILED -eq 0) {
    Write-Host "✅ 所有测试通过！" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ 有 $FAILED 个测试失败" -ForegroundColor Red
    exit 1
}
