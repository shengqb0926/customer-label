const { Client } = require('pg');

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

    // 先清空现有数据（按依赖顺序）
    console.log('🗑️  清空现有数据...');
    await client.query('DELETE FROM feedback_statistics;');
    await client.query('DELETE FROM tag_recommendations;');
    await client.query('DELETE FROM tag_scores;');
    await client.query('DELETE FROM clustering_configs;');
    await client.query('DELETE FROM recommendation_rules;');
    console.log('   ✅ 清空完成\n');

    // 1. 插入推荐规则
    console.log('📄 插入推荐规则...');
    await client.query(`
      INSERT INTO recommendation_rules (rule_name, rule_expression, priority, tag_template, is_active) VALUES
      ('高价值客户识别', 'customer.monthly_revenue >= 10000', 100, '{"name": "高价值客户", "category": "value", "baseConfidence": 0.95}'::jsonb, true),
      ('活跃客户识别', 'customer.last_login_days <= 7', 90, '{"name": "活跃客户", "category": "activity", "baseConfidence": 0.88}'::jsonb, true),
      ('流失风险识别', 'customer.last_purchase_days >= 30', 85, '{"name": "流失风险", "category": "risk", "baseConfidence": 0.82}'::jsonb, true)
    `);
    console.log('   ✅ 插入 3 条推荐规则\n');

    // 2. 插入聚类配置
    console.log('📄 插入聚类配置...');
    await client.query(`
      INSERT INTO clustering_configs (config_name, algorithm, parameters, feature_weights, is_active) VALUES
      ('客户分群默认配置', 'k-means', '{"k": 8, "maxIterations": 100}'::jsonb, '{"transactionFeatures": 0.4, "interactionFeatures": 0.3}'::jsonb, true)
    `);
    console.log('   ✅ 插入 1 条聚类配置\n');

    // 3. 插入标签评分（使用 0-1 之间的小数，符合 DECIMAL(5,4)）
    console.log('📄 插入标签评分...');
    await client.query(`
      INSERT INTO tag_scores (tag_id, tag_name, coverage_score, coverage_value, discrimination_score, discrimination_iv, stability_score, stability_psi, business_value_score, business_value_roi, overall_score, recommendation) VALUES
      (1, '高价值客户', 0.8550, 0.1250, 0.8820, 0.3500, 0.9210, 0.0800, 0.9500, 2.5000, 0.9020, '强烈推荐'),
      (2, '活跃客户', 0.7230, 0.2350, 0.7580, 0.2800, 0.8850, 0.1200, 0.8200, 1.8000, 0.7970, '推荐'),
      (3, '流失风险', 0.6500, 0.0890, 0.9050, 0.4200, 0.7820, 0.1500, 0.8800, 3.2000, 0.8040, '推荐')
    `);
    console.log('   ✅ 插入 3 条标签评分\n');

    // 4. 插入标签推荐
    console.log('📄 插入标签推荐...');
    await client.query(`
      INSERT INTO tag_recommendations (customer_id, tag_name, tag_category, confidence, source, reason, score_overall, is_accepted) VALUES
      (1001, '高价值客户', 'value', 0.9500, 'rule', '月消费金额 15000 元', 0.9250, true),
      (1001, '活跃客户', 'activity', 0.8800, 'rule', '最近登录 3 天前', 0.8500, false),
      (1002, '流失风险', 'risk', 0.8200, 'rule', '最近 45 天未购买', 0.7850, true),
      (1003, '新客户', 'lifecycle', 0.9000, 'rule', '注册 15 天', 0.8800, true),
      (1004, '高价值客户', 'value', 0.9200, 'rule', '月消费金额 12000 元', 0.9000, false)
    `);
    console.log('   ✅ 插入 5 条标签推荐\n');

    // 5. 插入反馈统计
    console.log('📄 插入反馈统计...');
    await client.query(`
      INSERT INTO feedback_statistics (date, total_recommendations, accepted_count, rejected_count, ignored_count, modified_count, avg_confidence, acceptance_rate) VALUES
      ('2026-03-16', 150, 95, 30, 20, 5, 0.8200, 0.6300),
      ('2026-03-17', 165, 108, 28, 22, 7, 0.8400, 0.6500),
      ('2026-03-18', 142, 89, 32, 18, 3, 0.8100, 0.6300),
      ('2026-03-19', 178, 120, 25, 28, 5, 0.8500, 0.6700),
      ('2026-03-20', 160, 102, 30, 24, 4, 0.8300, 0.6400)
    `);
    console.log('   ✅ 插入 5 条反馈统计\n');

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
    
    console.log('\n📋 标签推荐示例:\n');
    const examples = await client.query(`
      SELECT customer_id, tag_name, confidence, source, is_accepted 
      FROM tag_recommendations 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('   客户 ID\t标签名\t\t置信度\t来源\t已采纳');
    console.log('   ' + '-'.repeat(60));
    examples.rows.forEach(row => {
      const accepted = row.is_accepted ? '✓ 是' : '✗ 否';
      console.log(`   ${row.customer_id}\t\t${row.tag_name}\t${row.confidence}\t${row.source}\t${accepted}`);
    });
    
    console.log('\n📋 标签评分示例:\n');
    const scores = await client.query(`
      SELECT tag_name, overall_score, recommendation 
      FROM tag_scores 
      ORDER BY overall_score DESC
    `);
    
    scores.rows.forEach(row => {
      console.log(`   ${row.tag_name}\t综合评分：${(row.overall_score * 100).toFixed(2)}\t推荐等级：${row.recommendation}`);
    });
    
    console.log('\n🎉 测试数据插入完成！\n');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 插入失败:', error.message);
    if (error.detail) {
      console.error('详情:', error.detail);
    }
    console.error('\n错误位置:', error.position);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

insertTestData();
