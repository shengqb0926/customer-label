-- 创建推荐规则表
CREATE TABLE IF NOT EXISTS recommendation_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  expression JSONB NOT NULL,
  priority INTEGER DEFAULT 50,
  tags JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  hit_count BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_recommendation_rules_is_active ON recommendation_rules(is_active);
CREATE INDEX idx_recommendation_rules_priority ON recommendation_rules(priority DESC);

-- 插入默认规则数据
INSERT INTO recommendation_rules (name, description, expression, priority, tags, is_active, hit_count)
VALUES 
  (
    '高价值客户识别',
    '识别消费金额和订单数双高的客户',
    '{"operator": "AND", "conditions": [{"field": "totalOrders", "operator": ">=", "value": 10}, {"field": "totalAmount", "operator": ">=", "value": 10000}]}'::jsonb,
    90,
    '["高价值客户", "VIP 客户"]'::jsonb,
    TRUE,
    0
  ),
  (
    '流失风险预警',
    '识别长时间未购买的客户',
    '{"operator": "AND", "conditions": [{"field": "lastOrderDate", "operator": "<", "value": "2025-12-28"}, {"field": "totalOrders", "operator": ">=", "value": 3}]}'::jsonb,
    85,
    '["流失风险", "需跟进"]'::jsonb,
    TRUE,
    0
  ),
  (
    '潜力客户挖掘',
    '识别年轻且有消费能力的客户',
    '{"operator": "AND", "conditions": [{"field": "profile.age", "operator": "between", "value": [25, 40]}, {"field": "profile.city", "operator": "in", "value": ["北京", "上海", "广州", "深圳"]}, {"field": "avgOrderValue", "operator": ">=", "value": 500}]}'::jsonb,
    80,
    '["潜力客户", "重点培养"]'::jsonb,
    TRUE,
    0
  ),
  (
    '频繁购买者',
    '识别购买频率高的客户',
    '{"operator": "AND", "conditions": [{"field": "ordersLast30Days", "operator": ">=", "value": 5}, {"field": "ordersLast90Days", "operator": ">=", "value": 12}]}'::jsonb,
    75,
    '["频繁购买者", "活跃客户"]'::jsonb,
    TRUE,
    0
  )
ON CONFLICT (name) DO NOTHING;
