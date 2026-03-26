@echo off
chcp 65001 >nul
echo ========================================
echo   客户标签智能推荐系统
echo   Customer Label Intelligent Recommendation System
echo ========================================
echo.

REM 设置工作目录
cd /d "%~dp0"

echo [检查] 验证环境依赖...
echo.

REM 检查 Node.js
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js!
    pause
    exit /b 1
)
echo ✅ Node.js: 
node --version
echo.

REM 检查 PostgreSQL
echo [检查] PostgreSQL 连接...
pg_isready -h localhost -p 5432 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  PostgreSQL 可能未启动或端口不是 5432
    echo    请确认:
    echo    1. PostgreSQL 服务已启动
    echo    2. 数据库 customer_label 已创建
    echo    3. 用户名密码正确 (.env 文件)
    echo.
    set /p CONTINUE="是否继续启动？(y/n): "
    if /i not "%CONTINUE%"=="y" exit /b 1
) else (
    echo ✅ PostgreSQL 已就绪
)
echo.

REM 检查 Redis
echo [检查] Redis 连接...
redis-cli ping >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Redis 可能未启动或端口不是 6379
    echo    请确认:
    echo    1. Redis 服务已启动
    echo    2. Redis 地址正确 (.env 文件)
    echo.
    set /p CONTINUE="是否继续启动？(y/n): "
    if /i not "%CONTINUE%"=="y" exit /b 1
) else (
    echo ✅ Redis 已就绪
)
echo.

REM 检查 node_modules
if not exist "node_modules\" (
    echo [安装] 首次启动，正在安装依赖...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 依赖安装失败！
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
)

REM 检查 .env 文件
if not exist ".env" (
    echo [配置] 创建默认配置文件...
    if exist ".env.example" (
        copy .env.example .env >nul
        echo ✅ 已创建 .env 文件，请根据需要修改配置
    ) else (
        echo ⚠️  未找到 .env.example，请手动创建 .env 文件
        pause
    )
    echo.
)

REM 启动应用
echo ========================================
echo [启动] 启动应用服务器...
echo ========================================
echo.
echo 📡 访问地址:
echo   - API: http://localhost:3000/api/v1
echo   - Swagger 文档：http://localhost:3000/api/docs
echo   - 健康检查：http://localhost:3000/health
echo   - Prometheus 指标：http://localhost:3000/metrics
echo.
echo 🔑 默认账号:
echo   - 用户名：admin
echo   - 密码：admin123
echo.
echo 📝 按 Ctrl+C 停止服务
echo ========================================
echo.

call npm run dev
