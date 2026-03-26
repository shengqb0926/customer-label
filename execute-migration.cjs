const { Client } = require('pg');
const fs = require('fs');

async function runMigrations() {
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
    let sql = fs.readFileSync('d:/VsCode/customer-label/run-migrations.sql', 'utf8');
    
    // 移除注释行（保留 SQL）
    sql = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
    
    console.log('📄 创建数据库表...\n');
    
    // 执行每个 CREATE TABLE 语句
    const createTableRegex = /CREATE TABLE[^;]+;/g;
    let match;
    
    while ((match = createTableRegex.exec(sql)) !== null) {
      const statement = match[0];
      const tableNameMatch = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/i);
      const tableName = tableNameMatch ? tableNameMatch[1] : 'unknown';
      
      try {
        await client.query(statement);
        console.log(`   ✓ 创建表：${tableName}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠  表 ${tableName} 已存在，跳过`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n📄 创建索引...\n');
    
    // 执行每个 CREATE INDEX 语句
    const createIndexRegex = /CREATE INDEX[^;]+;/g;
    
    while ((match = createIndexRegex.exec(sql)) !== null) {
      const statement = match[0];
      const indexNameMatch = statement.match(/CREATE INDEX\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/i);
      const indexName = indexNameMatch ? indexNameMatch[1] : 'unknown';
      
      try {
        await client.query(statement);
        console.log(`   ✓ 创建索引：${indexName}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠  索引 ${indexName} 已存在，跳过`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✅ 所有 DDL 语句执行完成\n');
    
    // 验证创建的表
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 数据库中现有的表:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    console.log('\n🎉 数据库迁移完成！所有表已创建成功！\n');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error('\n错误详情:', error.stack);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

runMigrations();
