-- 创建客户标签关联表
CREATE TABLE IF NOT EXISTS customer_tags (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    tag_category VARCHAR(50),
    tagged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag_name ON customer_tags(tag_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_tags_unique ON customer_tags(customer_id, tag_name);

-- 插入示例数据（可选）
-- 为前 100 个客户随机分配一些标签
INSERT INTO customer_tags (customer_id, tag_name, tag_category, tagged_at)
SELECT 
    c.id as customer_id,
    tag.tag_name,
    tag.tag_category,
    NOW() - (random() * interval '365 days') as tagged_at
FROM (
    SELECT generate_series(1, 100) as id
) c
CROSS JOIN (
    VALUES 
        ('高价值客户', '价值分层'),
        ('潜力客户', '价值分层'),
        ('一般保持客户', '价值分层'),
        ('重点发展客户', '价值分层'),
        ('流失预警客户', '风险预警'),
        ('睡眠客户', '活跃状态'),
        ('活跃客户', '活跃状态'),
        ('新客户', '生命周期'),
        ('忠诚客户', '生命周期'),
        ('RFM 高分客户', 'RFM 模型')
) AS tag(tag_name, tag_category)
WHERE random() < 0.3  -- 30% 的概率分配标签
ORDER BY c.id, tag.tag_name;

-- 验证插入结果
SELECT 
    COUNT(*) as total_tags,
    COUNT(DISTINCT customer_id) as customers_with_tags,
    COUNT(DISTINCT tag_name) as unique_tags
FROM customer_tags;
