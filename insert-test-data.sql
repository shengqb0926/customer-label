-- 客户标签智能推荐系统 - 测试数据插入脚本
-- 用途：为各表插入模拟测试数据
-- 执行方式：psql -U postgres -d customer_label -f insert-test-data.sql

BEGIN;

-- ============================================
-- 1. 插入推荐规则数据 (recommendation_rules)
-- ============================================
INSERT INTO recommendation_rules (rule_name, rule_expression, priority, tag_template, is_active, hit_count, acceptance_rate, created_by, updated_by) VALUES
-- 高价值客户识别规则
('高价值客户识别', 
 'customer.monthly_revenue >= 10000 && customer.purchase_frequency >= 3', 
 100, 
 '{"name": "高价值客户", "category": "value", "baseConfidence": 0.95}'::jsonb,
 true, 0, null, 1, 1),

-- 活跃客户识别规则
('活跃客户识别', 
 'customer.last_login_days <= 7 && customer.monthly_visits >= 10', 
 90, 
 '{"name": "活跃客户", "category": "activity", "baseConfidence": 0.88}'::jsonb,
 true, 0, null, 1, 1),

-- 流失风险客户识别
('流失风险客户识别', 
 'customer.last_purchase_days >= 30 && customer.login_frequency < 2', 
 85, 
 '{"name": "流失风险", "category": "risk", "baseConfidence": 0.82}'::jsonb,
 true, 0, null, 1, 1),

-- 新客户识别规则
('新客户识别', 
 'customer.register_days <= 30 && customer.total_orders >= 1', 
 80, 
 '{"name": "新客户", "category": "lifecycle", "baseConfidence": 0.90}'::jsonb,
 true, 0, null, 1, 1),

-- 价格敏感客户识别
('价格敏感客户识别', 
 'customer.discount_usage_rate >= 0.7 && customer.avg_order_value < 200', 
 75, 
 '{"name": "价格敏感", "category": "preference", "baseConfidence": 0.85}'::jsonb,
 true, 0, null, 1, 1);

-- ============================================
-- 2. 插入聚类配置数据 (clustering_configs)
-- ============================================
INSERT INTO clustering_configs (config_name, algorithm, parameters, feature_weights, is_active) VALUES
-- 默认客户分群配置
('客户分群默认配置', 
 'k-means', 
 '{"k": 8, "maxIterations": 100, "convergenceThreshold": 0.001, "minClusterSize": 10}'::jsonb,
 '{"transactionFeatures": 0.4, "interactionFeatures": 0.3, "timeFeatures": 0.2, "otherFeatures": 0.1}'::jsonb,
 true),

-- 高价值客户细分配置
('高价值客户细分', 
 'hierarchical', 
 '{"linkage": "ward", "distance": "euclidean", "maxClusters": 5}'::jsonb,
 '{"revenueWeight": 0.5, "profitWeight": 0.3, "frequencyWeight": 0.2}'::jsonb,
 true);

-- ============================================
-- 3. 插入标签评分数据 (tag_scores)
-- ============================================
INSERT INTO tag_scores (tag_id, tag_name, coverage_score, coverage_value, discrimination_score, discrimination_iv, stability_score, stability_psi, business_value_score, business_value_roi, overall_score, recommendation, insights) VALUES
(1, '高价值客户', 85.5000, 0.125000, 88.2000, 0.350000, 92.1000, 0.080000, 95.0000, 2.500000, 90.2000, '强烈推荐', 
 ARRAY['该标签覆盖 12.5% 的客户，处于理想区间', '对高价值客户的识别准确率达 88%', '使用该标签的营销活动 ROI 提升 2.5 倍']),

(2, '活跃客户', 72.3000, 0.235000, 75.8000, 0.280000, 88.5000, 0.120000, 82.0000, 1.800000, 79.7000, '推荐', 
 ARRAY['覆盖率较高，适合大规模营销', '用户活跃度与转化率正相关', '建议用于促活类活动']),

(3, '流失风险', 65.0000, 0.089000, 90.5000, 0.420000, 78.2000, 0.150000, 88.0000, 3.200000, 80.4000, '推荐', 
 ARRAY['虽然覆盖率较低，但区分度极高', '预警准确率超过 90%', '建议优先用于客户挽留']),

(4, '新客户', 58.2000, 0.156000, 70.3000, 0.220000, 95.8000, 0.050000, 75.0000, 1.500000, 74.8000, '中性', 
 ARRAY['新客户群体稳定增长', '需要更多时间观察行为特征', '适合用于新手引导策略']),

(5, '价格敏感', 80.1000, 0.312000, 68.5000, 0.190000, 85.2000, 0.100000, 70.0000, 1.200000, 75.9000, '中性', 
 ARRAY['占比较高，是重要客户群体', '对折扣活动响应积极', '利润率相对较低']);

-- ============================================
-- 4. 插入标签推荐数据 (tag_recommendations)
-- ============================================
INSERT INTO tag_recommendations (customer_id, tag_name, tag_category, confidence, source, reason, score_overall, is_accepted, accepted_at, accepted_by, expires_at) VALUES
-- 客户 1001 的推荐
(1001, '高价值客户', 'value', 0.9500, 'rule', '月消费金额 15000 元，月购买频次 5 次', 92.5000, true, NOW() - INTERVAL '5 days', 1, NOW() + INTERVAL '25 days'),
(1001, '活跃客户', 'activity', 0.8800, 'rule', '最近登录 3 天前，月访问 15 次', 85.0000, false, NULL, NULL, NOW() + INTERVAL '25 days'),

-- 客户 1002 的推荐
(1002, '流失风险', 'risk', 0.8200, 'rule', '最近 45 天未购买，登录频率低于 2 次/月', 78.5000, true, NOW() - INTERVAL '2 days', 1, NOW() + INTERVAL '28 days'),
(1002, '价格敏感', 'preference', 0.7500, 'association', '历史订单中 80% 使用优惠券', 72.0000, false, NULL, NULL, NOW() + INTERVAL '28 days'),

-- 客户 1003 的推荐
(1003, '新客户', 'lifecycle', 0.9000, 'rule', '注册 15 天，已完成首单', 88.0000, true, NOW() - INTERVAL '1 day', 2, NOW() + INTERVAL '29 days'),
(1003, '活跃客户', 'activity', 0.8500, 'clustering', '基于行为聚类分析结果', 82.5000, false, NULL, NULL, NOW() + INTERVAL '29 days'),

-- 客户 1004 的推荐（多个标签）
(1004, '高价值客户', 'value', 0.9200, 'rule', '月消费金额 12000 元，季度复购率 100%', 90.0000, false, NULL, NULL, NOW() + INTERVAL '27 days'),
(1004, '活跃客户', 'activity', 0.8900, 'rule', '每周至少登录 3 次', 86.5000, false, NULL, NULL, NOW() + INTERVAL '27 days'),
(1004, '流失风险', 'risk', 0.6500, 'clustering', '聚类分析显示潜在流失特征', 68.0000, false, NULL, NULL, NOW() + INTERVAL '27 days'),

-- 客户 1005 的推荐
(1005, '价格敏感', 'preference', 0.8800, 'rule', '优惠券使用率 85%，平均客单价 150 元', 80.0000, true, NOW() - INTERVAL '3 days', 1, NOW() + INTERVAL '27 days');

-- ============================================
-- 5. 插入反馈统计数据 (feedback_statistics)
-- ============================================
INSERT INTO feedback_statistics (date, total_recommendations, accepted_count, rejected_count, ignored_count, modified_count, avg_confidence, acceptance_rate) VALUES
(CURRENT_DATE - INTERVAL '10 days', 150, 95, 30, 20, 5, 0.8200, 0.6300),
(CURRENT_DATE - INTERVAL '9 days', 165, 108, 28, 22, 7, 0.8400, 0.6500),
(CURRENT_DATE - INTERVAL '8 days', 142, 89, 32, 18, 3, 0.8100, 0.6300),
(CURRENT_DATE - INTERVAL '7 days', 178, 120, 25, 28, 5, 0.8500, 0.6700),
(CURRENT_DATE - INTERVAL '6 days', 160, 102, 30, 24, 4, 0.8300, 0.6400),
(CURRENT_DATE - INTERVAL '5 days', 155, 98, 35, 19, 3, 0.8200, 0.6300),
(CURRENT_DATE - INTERVAL '4 days', 170, 115, 28, 22, 5, 0.8600, 0.6800),
(CURRENT_DATE - INTERVAL '3 days', 185, 125, 30, 25, 5, 0.8700, 0.6800),
(CURRENT_DATE - INTERVAL '2 days', 172, 110, 32, 26, 4, 0.8400, 0.6400),
(CURRENT_DATE - INTERVAL '1 day', 168, 108, 35, 20, 5, 0.8300, 0.6400);

COMMIT;

-- ============================================
-- 验证插入的数据
-- ============================================
SELECT '✅ 测试数据插入完成！' AS status;

SELECT '📊 数据统计:' AS info;

SELECT '推荐规则' AS category, COUNT(*) AS count FROM recommendation_rules
UNION ALL
SELECT '聚类配置', COUNT(*) FROM clustering_configs
UNION ALL
SELECT '标签评分', COUNT(*) FROM tag_scores
UNION ALL
SELECT '标签推荐', COUNT(*) FROM tag_recommendations
UNION ALL
SELECT '反馈统计', COUNT(*) FROM feedback_statistics;

-- 查看部分示例数据
SELECT '📋 标签推荐示例 (前 5 条):' AS info;
SELECT customer_id, tag_name, confidence, source, is_accepted 
FROM tag_recommendations 
ORDER BY created_at DESC 
LIMIT 5;

SELECT '📋 标签评分示例:' AS info;
SELECT tag_name, overall_score, recommendation 
FROM tag_scores 
ORDER BY overall_score DESC;
