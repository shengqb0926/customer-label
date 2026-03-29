# 客户标签表初始化脚本
# 用于创建 customer_tags 表并插入示例数据

Write-Host "🚀 开始初始化客户标签表..." -ForegroundColor Green

# 数据库配置
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "customer-label"
$DB_USER = "postgres"

# 检查 PostgreSQL 是否运行
try {
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "无法连接到 PostgreSQL 数据库"
    }
    Write-Host "✅ PostgreSQL 连接成功" -ForegroundColor Green
} catch {
    Write-Host "❌ $_" -ForegroundColor Red
    Write-Host "💡 请确保 PostgreSQL 服务正在运行" -ForegroundColor Yellow
    exit 1
}

# 检查数据库是否存在
$dbExists = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" -t 2>&1
if ([string]::IsNullOrWhiteSpace($dbExists)) {
    Write-Host "❌ 数据库 '$DB_NAME' 不存在" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 数据库 '$DB_NAME' 存在" -ForegroundColor Green

# 执行迁移脚本
Write-Host "📝 执行数据库迁移..." -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/create-customer-tags-table.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 数据库迁移成功!" -ForegroundColor Green
    
    # 验证结果
    Write-Host "`n📊 验证数据..." -ForegroundColor Cyan
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as total_tags, COUNT(DISTINCT customer_id) as customers_with_tags, COUNT(DISTINCT tag_name) as unique_tags FROM customer_tags"
    
    Write-Host "`n✨ 初始化完成!" -ForegroundColor Green
    Write-Host "`n💡 下一步:" -ForegroundColor Yellow
    Write-Host "   1. 重启后端服务：npm run dev:all" -ForegroundColor White
    Write-Host "   2. 运行关联引擎测试：node test-association-engine.js" -ForegroundColor White
} else {
    Write-Host "❌ 数据库迁移失败" -ForegroundColor Red
    exit 1
}
