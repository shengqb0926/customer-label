const { Client } = require('pg');

async function testPostgreSQL() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'customer_label',
  });

  try {
    console.log('🔍 正在连接 PostgreSQL...');
    await client.connect();
    console.log('✅ PostgreSQL 连接成功！');

    // 查询数据库版本
    const result = await client.query('SELECT version();');
    console.log('📊 PostgreSQL 版本:', result.rows[0].version.split(',')[0]);

    // 查询当前数据库
    const dbResult = await client.query('SELECT current_database();');
    console.log('📊 当前数据库:', dbResult.rows[0].current_database);

    // 查询所有表
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    if (tables.rows.length > 0) {
      console.log('📋 已存在的表:');
      tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    } else {
      console.log('ℹ️  数据库中暂无表（还未执行迁移）');
    }

    await client.end();
    console.log('✅ PostgreSQL 测试完成！\n');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL 连接失败:', error.message);
    console.error('\n💡 可能的原因:');
    console.error('   1. PostgreSQL 服务未启动');
    console.error('   2. 数据库 customer_label 未创建');
    console.error('   3. 用户名或密码错误');
    console.error('   4. 端口被占用或防火墙阻止');
    console.error('\n💡 解决方案:');
    console.error('   1. 检查 PostgreSQL 服务是否运行');
    console.error('   2. 创建数据库：CREATE DATABASE customer_label;');
    console.error('   3. 检查 .env 文件中的配置');
    return false;
  }
}

testPostgreSQL().then(success => {
  process.exit(success ? 0 : 1);
});
