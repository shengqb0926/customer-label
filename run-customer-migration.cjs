const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'customer_label',
  });

  try {
    console.log('🚀 开始执行数据库迁移...\n');
    
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, 'src/modules/recommendation/migrations/create-customers-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 执行 SQL 语句...\n');
    
    // 直接执行整个 SQL 文件（不分割）
    await client.query(sql);
    
    console.log('\n✅ 成功创建 customers 表及相关索引');
    console.log('\n🎉 数据库迁移完成！\n');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();