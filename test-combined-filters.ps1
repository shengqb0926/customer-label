# 推荐结果管理功能 - 组合查询测试脚本
# 用于验证所有筛选条件的组合查询功能

$BASE_URL = "http://localhost:3000/api/v1"
$TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0IiwidXNlcm5hbWUiOiJidXNpbmVzc191c2VyIiwicm9sZXMiOlsiYW5hbHlzdCIsInVzZXIiXSwiZW1haWwiOiJidXNpbmVzc0BleGFtcGxlLmNvbSIsImlhdCI6MTc3NDU5NTczMywiZXhwIjoxNzc0NTk5MzMzfQ.RHmnyFHj_0LAJK_ix5os_7PzJ60J9UGKyAnHdugTBxM"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  推荐结果管理 - 组合查询测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 测试计数器
$totalTests = 0
$passedTests = 0
$failedTests = 0

function Test-Query {
    param(
        [string]$Name,
        [string]$Params,
        [int]$ExpectedMinResults = 0
    )
    
    $totalTests += 1
    Write-Host "测试 $totalTests : $Name" -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/recommendations?$Params" -Headers @{ Authorization = $TOKEN } -Method GET
        
        if ($response.data -is [array]) {
            $count = $response.data.Count
            Write-Host "  ✓ 返回 $count 条结果 (page=$($response.page), limit=$($response.limit), total=$($response.total))" -ForegroundColor Green
            
            if ($count -ge $ExpectedMinResults) {
                $passedTests += 1
                return $true
            } else {
                Write-Host "  ✗ 结果数量不足 (期望 >= $ExpectedMinResults)" -ForegroundColor Red
                $failedTests += 1
                return $false
            }
        } else {
            Write-Host "  ✗ 响应格式错误" -ForegroundColor Red
            $failedTests += 1
            return $false
        }
    } catch {
        Write-Host "  ✗ 请求失败：$($_.Exception.Message)" -ForegroundColor Red
        $failedTests += 1
        return $false
    }
}

Write-Host "`n=== 基础查询测试 ===" -ForegroundColor Cyan

# 1. 基础分页查询
Test-Query -Name "基础分页 (page=1, limit=5)" -Params "page=1&limit=5" -ExpectedMinResults 0

# 2. 状态筛选 - 待处理
Test-Query -Name "状态筛选：待处理 (isAccepted=false)" -Params "isAccepted=false&limit=10" -ExpectedMinResults 0

# 3. 状态筛选 - 已接受
Test-Query -Name "状态筛选：已接受 (isAccepted=true)" -Params "isAccepted=true&limit=10" -ExpectedMinResults 0

# 4. 客户 ID 模糊查询
Test-Query -Name "客户 ID 模糊查询 (customerName=4)" -Params "customerName=4&limit=10" -ExpectedMinResults 0

# 5. 标签类别筛选
Test-Query -Name "标签类别筛选 (category=偏好分析)" -Params "category=偏好分析&limit=10" -ExpectedMinResults 0

# 6. 推荐来源筛选
Test-Query -Name "推荐来源筛选 (source=rule)" -Params "source=rule&limit=10" -ExpectedMinResults 0

# 7. 最低置信度筛选
Test-Query -Name "最低置信度筛选 (minConfidence=0.8)" -Params "minConfidence=0.8&limit=10" -ExpectedMinResults 0

Write-Host "`n=== 组合查询测试 ===" -ForegroundColor Cyan

# 8. 状态 + 来源组合
Test-Query -Name "组合：待处理 + 规则引擎" -Params "isAccepted=false&source=rule&limit=10" -ExpectedMinResults 0

# 9. 状态 + 类别组合
Test-Query -Name "组合：待处理 + 偏好分析" -Params "isAccepted=false&category=偏好分析&limit=10" -ExpectedMinResults 0

# 10. 来源 + 置信度组合
Test-Query -Name "组合：规则引擎 + 高置信度" -Params "source=rule&minConfidence=0.7&limit=10" -ExpectedMinResults 0

# 11. 状态 + 来源 + 置信度三条件组合
Test-Query -Name "组合：待处理 + 规则引擎 + 高置信度" -Params "isAccepted=false&source=rule&minConfidence=0.7&limit=10" -ExpectedMinResults 0

# 12. 类别 + 状态 + 来源三条件组合
Test-Query -Name "组合：偏好分析 + 待处理 + 规则引擎" -Params "category=偏好分析&isAccepted=false&source=rule&limit=10" -ExpectedMinResults 0

Write-Host "`n=== 排序测试 ===" -ForegroundColor Cyan

# 13. 按置信度降序
Test-Query -Name "排序：置信度降序 (sortBy=confidence&sortOrder=desc)" -Params "sortBy=confidence&sortOrder=desc&limit=10" -ExpectedMinResults 0

# 14. 按创建时间降序
Test-Query -Name "排序：创建时间降序 (sortBy=createdAt&sortOrder=desc)" -Params "sortBy=createdAt&sortOrder=desc&limit=10" -ExpectedMinResults 0

# 15. 按置信度升序
Test-Query -Name "排序：置信度升序 (sortBy=confidence&sortOrder=asc)" -Params "sortBy=confidence&sortOrder=asc&limit=10" -ExpectedMinResults 0

Write-Host "`n=== 分页测试 ===" -ForegroundColor Cyan

# 16. 第 2 页
Test-Query -Name "分页：第 2 页 (page=2, limit=5)" -Params "page=2&limit=5" -ExpectedMinResults 0

# 17. 每页 50 条
Test-Query -Name "分页：每页 50 条 (limit=50)" -Params "limit=50" -ExpectedMinResults 0

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  测试总结" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "总测试数：$totalTests" -ForegroundColor White
Write-Host "通过：$passedTests ✓" -ForegroundColor Green
Write-Host "失败：$failedTests ✗" -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Red" })
Write-Host "通过率：$([math]::Round(($passedTests / $totalTests) * 100, 2))%" -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($failedTests -eq 0) {
    Write-Host "🎉 所有测试通过！" -ForegroundColor Green
} else {
    Write-Host "⚠️  有 $failedTests 个测试失败，请检查日志" -ForegroundColor Yellow
}
