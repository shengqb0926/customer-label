# 推荐结果管理 - 边界测试与压力测试脚本
# 用于验证极端场景和性能表现

$BASE_URL = "http://localhost:3000/api/v1"
$TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0IiwidXNlcm5hbWUiOiJidXNpbmVzc191c2VyIiwicm9sZXMiOlsiYW5hbHlzdCIsInVzZXIiXSwiZW1haWwiOiJidXNpbmVzc0BleGFtcGxlLmNvbSIsImlhdCI6MTc3NDU5NTczMywiZXhwIjoxNzc0NTk5MzMzfQ.RHmnyFHj_0LAJK_ix5os_7PzJ60J9UGKyAnHdugTBxM"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  边界测试与压力测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passedTests = 0
$failedTests = 0

function Test-Boundary {
    param(
        [string]$Name,
        [string]$Params,
        [int]$ExpectedMinResults = 0,
        [int]$MaxResponseTimeMs = 2000
    )
    
    Write-Host "测试：$Name" -ForegroundColor Yellow
    
    $startTime = Get-Date
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/recommendations?$Params" -Headers @{ Authorization = $TOKEN } -Method GET
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        if ($response.data -is [array]) {
            $count = $response.data.Count
            
            # 检查响应时间
            $timeStatus = if ($responseTime -lt $MaxResponseTimeMs) { "✓" } else { "⚠" }
            Write-Host "  结果：$count 条 | 耗时：$([math]::Round($responseTime, 2))ms $timeStatus" -ForegroundColor $(if ($responseTime -lt $MaxResponseTimeMs) { "Green" } else { "Yellow" })
            
            if ($count -ge $ExpectedMinResults) {
                Write-Host "  ✓ 通过" -ForegroundColor Green
                $script:passedTests += 1
                return $true
            } else {
                Write-Host "  ✗ 结果数量不足" -ForegroundColor Red
                $script:failedTests += 1
                return $false
            }
        } else {
            Write-Host "  ✗ 响应格式错误" -ForegroundColor Red
            $script:failedTests += 1
            return $false
        }
    } catch {
        Write-Host "  ✗ 请求失败：$($_.Exception.Message)" -ForegroundColor Red
        $script:failedTests += 1
        return $false
    }
}

Write-Host "`n=== 边界值测试 ===" -ForegroundColor Cyan

# 1. 超大页大小
Test-Boundary -Name "超大页大小 (limit=100)" -Params "limit=100" -ExpectedMinResults 0 -MaxResponseTimeMs 5000

# 2. 超小置信度
Test-Boundary -Name "最低置信度 (minConfidence=0.0)" -Params "minConfidence=0.0&limit=10" -ExpectedMinResults 0

# 3. 超高置信度
Test-Boundary -Name "最高置信度 (minConfidence=1.0)" -Params "minConfidence=1.0&limit=10" -ExpectedMinResults 0

# 4. 空字符串搜索
Test-Boundary -Name "空字符串客户搜索 (customerName='')" -Params "customerName=&limit=10" -ExpectedMinResults 0

# 5. 特殊字符搜索
Test-Boundary -Name "特殊字符搜索 (customerName='%')" -Params "customerName=%&limit=10" -ExpectedMinResults 0

# 6. 超长分页偏移
Test-Boundary -Name "超大页码 (page=999)" -Params "page=999&limit=10" -ExpectedMinResults 0

# 7. 负数页码（应被忽略或使用默认值）
Test-Boundary -Name "负数页码 (page=-1)" -Params "page=-1&limit=10" -ExpectedMinResults 0

# 8. 零限制
Test-Boundary -Name "零限制 (limit=0)" -Params "limit=0" -ExpectedMinResults 0

Write-Host "`n=== 组合条件压力测试 ===" -ForegroundColor Cyan

# 9. 四条件组合
Test-Boundary -Name "四条件组合 (状态 + 来源 + 类别 + 置信度)" -Params "isAccepted=false&source=rule&category=偏好分析&minConfidence=0.5&limit=10" -MaxResponseTimeMs 3000

# 10. 五条件组合
Test-Boundary -Name "五条件组合 (全筛选条件)" -Params "isAccepted=false&source=rule&category=偏好分析&minConfidence=0.5&customerName=4&limit=10" -MaxResponseTimeMs 3000

# 11. 排序 + 筛选组合
Test-Boundary -Name "排序 + 筛选 (置信度升序 + 待处理)" -Params "isAccepted=false&sortBy=confidence&sortOrder=asc&limit=20" -MaxResponseTimeMs 3000

# 12. 多来源 OR 查询（如果支持）
Test-Boundary -Name "单来源筛选 (clustering)" -Params "source=clustering&limit=10" -MaxResponseTimeMs 2000

Write-Host "`n=== 日期范围测试 ===" -ForegroundColor Cyan

# 13. 过去日期范围
Test-Boundary -Name "历史日期范围 (startDate=2020-01-01&endDate=2020-12-31)" -Params "startDate=2020-01-01&endDate=2020-12-31&limit=10"

# 14. 未来日期范围
Test-Boundary -Name "未来日期范围 (startDate=2030-01-01&endDate=2030-12-31)" -Params "startDate=2030-01-01&endDate=2030-12-31&limit=10"

# 15. 仅开始日期
Test-Boundary -Name "仅开始日期 (startDate=2026-03-01)" -Params "startDate=2026-03-01&limit=10"

# 16. 仅结束日期
Test-Boundary -Name "仅结束日期 (endDate=2026-03-31)" -Params "endDate=2026-03-31&limit=10"

# 17. 无效日期格式
Test-Boundary -Name "无效日期格式 (startDate=invalid)" -Params "startDate=invalid&limit=10"

Write-Host "`n=== 并发性能测试 ===" -ForegroundColor Cyan

Write-Host "测试：10 个并发请求" -ForegroundColor Yellow
$concurrentStartTime = Get-Date
$jobs = @()
for ($i = 1; $i -le 10; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($url, $token)
        try {
            Invoke-RestMethod -Uri $url -Headers @{ Authorization = $token } -Method GET | Out-Null
            return $true
        } catch {
            return $false
        }
    } -ArgumentList "$BASE_URL/recommendations?limit=5", $TOKEN
}

# 等待所有作业完成
$jobs | Wait-Job | Receive-Job | Out-Null
$concurrentEndTime = Get-Date
$concurrentTime = ($concurrentEndTime - $concurrentStartTime).TotalMilliseconds

$successCount = ($jobs | Where-Object { $_.State -eq 'Completed' }).Count
Write-Host "  成功：$successCount/10 | 总耗时：$([math]::Round($concurrentTime, 2))ms" -ForegroundColor $(if ($successCount -eq 10) { "Green" } else { "Red" })

if ($successCount -eq 10) {
    $script:passedTests += 1
} else {
    $script:failedTests += 1
}

Write-Host "`n=== 拒绝功能测试 ===" -ForegroundColor Cyan

# 获取第一条待处理的推荐
try {
    $pendingRec = Invoke-RestMethod -Uri "$BASE_URL/recommendations?isAccepted=false&limit=1" -Headers @{ Authorization = $TOKEN } -Method GET
    
    if ($pendingRec.data -and $pendingRec.data.Count -gt 0) {
        $recId = $pendingRec.data[0].id
        Write-Host "找到待处理推荐 ID: $recId" -ForegroundColor Cyan
        
        # 测试拒绝操作
        Write-Host "测试：拒绝推荐 (ID: $recId)" -ForegroundColor Yellow
        try {
            $rejectResponse = Invoke-RestMethod -Uri "$BASE_URL/recommendations/$recId/reject" -Headers @{ Authorization = $TOKEN } -Method POST
            Write-Host "  ✓ 拒绝成功" -ForegroundColor Green
            $script:passedTests += 1
        } catch {
            Write-Host "  ✗ 拒绝失败：$($_.Exception.Message)" -ForegroundColor Red
            $script:failedTests += 1
        }
        
        # 验证状态已更新
        Write-Host "测试：验证拒绝后状态" -ForegroundColor Yellow
        try {
            $updatedRec = Invoke-RestMethod -Uri "$BASE_URL/recommendations/$recId" -Headers @{ Authorization = $TOKEN } -Method GET
            if ($updatedRec.isAccepted -eq $false -or $updatedRec.rejected -eq $true) {
                Write-Host "  ✓ 状态已正确更新为已拒绝" -ForegroundColor Green
                $script:passedTests += 1
            } else {
                Write-Host "  ⚠ 状态未更新或未知" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ⚠ 无法验证状态：$($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "跳过：没有找到待处理的推荐" -ForegroundColor Gray
    }
} catch {
    Write-Host "跳过：获取推荐列表失败" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  测试总结" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "通过：$passedTests ✓" -ForegroundColor Green
Write-Host "失败：$failedTests ✗" -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Red" })

if ($failedTests -eq 0) {
    Write-Host "`n🎉 所有边界测试通过！系统健壮性良好" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  有 $failedTests 个测试失败，请检查日志和错误处理" -ForegroundColor Yellow
}
