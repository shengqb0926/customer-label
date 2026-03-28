# 端口清理脚本 - 用于开发环境启动前清理占用的进程
# 使用方法：.\scripts\cleanup-ports.ps1

Write-Host "开始清理开发环境端口..." -ForegroundColor Cyan

$ports = @(3000, 5176) # 后端和前端端口

foreach ($port in $ports) {
    Write-Host "检查端口 :$port ..." -ForegroundColor Yellow
    
    # 查找占用端口的 PID
    $processInfo = netstat -ano | findstr ":$port" | findstr "LISTENING"
    
    if ($processInfo) {
        $pidValue = $processInfo.Split(' ')[-1]
        
        if ($pidValue -and $pidValue -match '^\d+$') {
            $processObj = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
            
            if ($processObj) {
                Write-Host "  发现进程占用 - PID: $($processObj.Id), 名称：$($processObj.ProcessName)" -ForegroundColor Red
                Write-Host "  正在停止进程..." -ForegroundColor Yellow
                
                try {
                    Stop-Process -Id $processObj.Id -Force -ErrorAction Stop
                    Write-Host "  成功停止进程" -ForegroundColor Green
                    Start-Sleep -Milliseconds 500 # 等待端口释放
                } catch {
                    Write-Host "  停止进程失败：$_" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "  端口空闲" -ForegroundColor Green
    }
}

Write-Host "`n端口清理完成!" -ForegroundColor Cyan
Write-Host "后端端口：3000" -ForegroundColor Cyan
Write-Host "前端端口：5176" -ForegroundColor Cyan
