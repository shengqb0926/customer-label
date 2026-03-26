const { Client } = require('pg');
const fs = require('fs');

async function insertTestData() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'customer_label',
  });

  try {
    console.log('🚀 开始插入测试数据...\n');
    
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // 读取 SQL 文件
    let sql = fs.readFileSync('d:/VsCode/customer-label/insert-test-data.sql', 'utf8');
    
    // 移除注释行
    sql = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
    
    console.log('📄 执行数据插入...\n');
    
    // 分割并执行每个 INSERT 语句
    const statements = sql.split(';');
    let insertCount = 0;
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed.toUpperCase().includes('INSERT INTO') || 
          trimmed.toUpperCase().includes('BEGIN') ||
          trimmed.toUpperCase().includes('COMMIT')) {
        try {
          await client.query(trimmed + ';');
          if (trimmed.toUpperCase().includes('INSERT INTO')) {
            insertCount++;
          }
        } catch (error) {
          // 忽略已存在的数据错误（如果表有唯一约束）
          if (!error.message.includes('duplicate') && 
              !error.message.includes('already exists')) {
            throw error;
          }
        }
      }
    }
    
    console.log(`✅ 成功执行 ${insertCount} 个 INSERT 语句\n`);
    
    // 验证插入的数据
    console.log('📊 数据统计:\n');
    
    const stats = await client.query(`
      SELECT '推荐规则' AS category, COUNT(*) AS count FROM recommendation_rules
      UNION ALL
      SELECT '聚类配置', COUNT(*) FROM clustering_configs
      UNION ALL
      SELECT '标签评分', COUNT(*) FROM tag_scores
      UNION ALL
      SELECT '标签推荐', COUNT(*) FROM tag_recommendations
      UNION ALL
      SELECT '反馈统计', COUNT(*) FROM feedback_statistics
    `);
    
    stats.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.count} 条`);
    });
    
    console.log('\n📋 标签推荐示例 (前 5 条):\n');
    const examples = await client.query(`
      SELECT customer_id, tag_name, confidence, source, is_accepted 
      FROM tag_recommendations 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('   客户 ID\t标签名\t\t置信度\t来源\t\t已采纳');
    console.log('   ' + '-'.repeat(70));
    examples.rows.forEach(row => {
      const sourceMap = {'rule': '规则', 'clustering': '聚类', 'association': '关联'};
      console.log(`   ${row.customer_id}\t\t${row.tag_name}\t${row.confidence}\t${sourceMap[row.source] || row.source}\t\t${row.is_accepted ? '✓' : '✗'}`);
    });
    
    console.log('\n📋 标签评分示例:\n');
    const scores = await client.query(`
      SELECT tag_name, overall_score, recommendation 
      FROM tag_scores 
      ORDER BY overall_score DESC
    `);
    
    console.log('   标签名\t\t综合评分\t推荐等级');
    console.log('   ' + '-'.repeat(50));
    scores.rows.forEach(row => {
      console.log(`   ${row.tag_name}\t${row.overall_score}\t${row.recommendation}`);
    });
    
    console.log('\n🎉 测试数据插入完成！\n');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 插入失败:', error.message);
    console.error('\n错误详情:', error.stack);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

insertTestData();
