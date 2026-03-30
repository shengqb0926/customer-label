# 数据库设计文档

**项目名称**: 客户标签推荐系统  
**版本**: v1.0  
**编制日期**: 2026-03-30

---

## 📊 一、ER 图

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  customers  │       │ tag_recommendations │       │recommendation_rules│
├─────────────┤       ├──────────────────┤       ├─────────────────┤
│ PK id       │◄──┐   │ PK id            │   ┌──►│ PK id           │
│    name     │   │   │ FK customer_id   │───┘   │    rule_name    │
│    email    │   └──►│    tag_name      │       │    conditions   │
│    level    │       │    confidence    │       │    tags         │
│    city     │       │    source        │       │    is_active    │
│    riskLevel│       │    status        │       │    created_at   │
│    totalAssets      │    accepted_at   │       └─────────────────┘
│    ...      │       │    rejected_at   │
└─────────────┘       │    ...           │       ┌─────────────────┐
                      └──────────────────┘       │clustering_configs│
                      ┌──────────────────┐       ├─────────────────┤
                      │ association_rules│       │ PK id           │
                      ├──────────────────┤       │    k_value      │
                      │ PK id            │       │    max_iter     │
                      │    antecedent    │       │    distance     │
                      │    consequent     │       │    is_active    │
                      │    support        │       │    ...          │
                      │    confidence     │       └─────────────────┘
                      │    lift           │
                      └──────────────────┘
```

---

## 📋 二、表结构详细设计

### 2.1 customers (客户信息表)

```sql
CREATE TABLE customers (
  -- 主键
  id SERIAL PRIMARY KEY,
  
  -- 基本信息
  name VARCHAR(100) NOT NULL COMMENT '客户姓名',
  email VARCHAR(255) UNIQUE COMMENT '邮箱',
  phone VARCHAR(20) COMMENT '手机号',
  gender VARCHAR(10) COMMENT '性别',
  age INT COMMENT '年龄',
  city VARCHAR(50) COMMENT '城市',
  
  -- 客户属性
  level VARCHAR(20) DEFAULT 'BRONZE' COMMENT '客户等级',
  risk_level VARCHAR(20) DEFAULT 'LOW' COMMENT '风险等级',
  total_assets DECIMAL(15,2) DEFAULT 0 COMMENT '总资产',
  annual_income DECIMAL(15,2) COMMENT '年收入',
  credit_score INT COMMENT '信用评分',
  
  -- 状态标识
  is_active BOOLEAN DEFAULT true COMMENT '是否活跃',
  is_vip BOOLEAN DEFAULT false COMMENT '是否 VIP',
  
  -- RFM 指标
  r_score INT DEFAULT 5 COMMENT '最近消费时间得分',
  f_score INT DEFAULT 5 COMMENT '消费频率得分',
  m_score INT DEFAULT 5 COMMENT '消费金额得分',
  rfm_total INT GENERATED ALWAYS AS (r_score + f_score + m_score) STORED,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_transaction_at TIMESTAMP COMMENT '最近交易时间',
  
  -- 索引
  CONSTRAINT chk_level CHECK (level IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
  CONSTRAINT chk_risk_level CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH'))
);

-- 索引
CREATE INDEX idx_customers_level ON customers(level);
CREATE INDEX idx_customers_city ON customers(city);
CREATE INDEX idx_customers_level_assets ON customers(level, total_assets DESC);
CREATE INDEX idx_customers_rfm_total ON customers(rfm_total DESC);
```

---

### 2.2 tag_recommendations (推荐标签表)

```sql
CREATE TABLE tag_recommendations (
  -- 主键
  id SERIAL PRIMARY KEY,
  
  -- 外键
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- 推荐内容
  tag_name VARCHAR(100) NOT NULL COMMENT '推荐标签名称',
  confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1) COMMENT '置信度',
  source VARCHAR(20) NOT NULL COMMENT '推荐来源引擎',
  reason TEXT COMMENT '推荐理由',
  
  -- 状态管理
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
  accepted_at TIMESTAMP COMMENT '接受时间',
  accepted_by INT COMMENT '接受人 ID',
  rejected_at TIMESTAMP COMMENT '拒绝时间',
  rejected_by INT COMMENT '拒绝人 ID',
  
  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb COMMENT '附加信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 约束
  CONSTRAINT chk_status CHECK (status IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT chk_source CHECK (source IN ('rule', 'clustering', 'association', 'fusion')),
  
  -- 唯一约束（避免重复推荐）
  UNIQUE(customer_id, tag_name, source)
);

-- 索引
CREATE INDEX idx_tag_recommendations_customer_id ON tag_recommendations(customer_id);
CREATE INDEX idx_tag_recommendations_status ON tag_recommendations(status);
CREATE INDEX idx_tag_recommendations_source ON tag_recommendations(source);
CREATE INDEX idx_tag_recommendations_confidence ON tag_recommendations(confidence DESC);
CREATE INDEX idx_tag_recommendations_created_at ON tag_recommendations(created_at DESC);
```

---

### 2.3 recommendation_rules (规则配置表)

```sql
CREATE TABLE recommendation_rules (
  -- 主键
  id SERIAL PRIMARY KEY,
  
  -- 规则定义
  rule_name VARCHAR(100) NOT NULL UNIQUE COMMENT '规则名称',
  description TEXT COMMENT '规则描述',
  rule_type VARCHAR(20) NOT NULL DEFAULT 'expression' COMMENT '规则类型',
  
  -- 条件表达式（JSON 格式）
  conditions JSONB NOT NULL COMMENT '条件表达式',
  /*
  示例:
  {
    "operator": "AND",
    "conditions": [
      {"field": "totalAssets", "op": ">=", "value": 5000000},
      {"field": "level", "op": "=", "value": "GOLD"}
    ]
  }
  */
  
  -- 推荐标签
  recommended_tags JSONB NOT NULL COMMENT '推荐标签列表',
  /*
  示例:
  ["高价值客户", "私人银行客户"]
  */
  
  -- 优先级和权重
  priority INT DEFAULT 100 COMMENT '优先级（数字越大优先级越高）',
  weight DECIMAL(3,2) DEFAULT 1.0 COMMENT '权重系数',
  
  -- 状态
  is_active BOOLEAN DEFAULT true COMMENT '是否激活',
  
  -- 统计
  execution_count INT DEFAULT 0 COMMENT '执行次数',
  success_rate DECIMAL(5,4) COMMENT '成功率',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_executed_at TIMESTAMP COMMENT '最后执行时间'
);

-- 索引
CREATE INDEX idx_recommendation_rules_is_active ON recommendation_rules(is_active);
CREATE INDEX idx_recommendation_rules_priority ON recommendation_rules(priority DESC);
```

---

### 2.4 clustering_configs (聚类配置表)

```sql
CREATE TABLE clustering_configs (
  -- 主键
  id SERIAL PRIMARY KEY,
  
  -- 算法参数
  k_value INT NOT NULL DEFAULT 5 CHECK (k_value >= 2 AND k_value <= 20) COMMENT '簇数量',
  max_iterations INT DEFAULT 100 CHECK (max_iterations >= 10) COMMENT '最大迭代次数',
  convergence_threshold DECIMAL(10,6) DEFAULT 0.001 COMMENT '收敛阈值',
  initialization_method VARCHAR(20) DEFAULT 'kmeans++' COMMENT '初始化方法',
  distance_metric VARCHAR(20) DEFAULT 'euclidean' COMMENT '距离度量',
  
  -- 特征选择
  selected_features JSONB NOT NULL DEFAULT '["totalAssets", "transactionCount", "avgTransactionAmount"]'::jsonb COMMENT '选中的特征字段',
  
  -- 状态
  is_active BOOLEAN DEFAULT true COMMENT '是否当前使用',
  
  -- 上次运行结果
  last_run_at TIMESTAMP COMMENT '最后运行时间',
  last_silhouette_score DECIMAL(5,4) COMMENT '轮廓系数',
  cluster_sizes JSONB COMMENT '各簇大小',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_clustering_configs_is_active ON clustering_configs(is_active);
```

---

### 2.5 association_rules (关联规则表)

```sql
CREATE TABLE association_rules (
  -- 主键
  id SERIAL PRIMARY KEY,
  
  -- 规则内容
  antecedent VARCHAR(200) NOT NULL COMMENT '前项（条件）',
  /* 示例："{手机，充电器}" */
  
  consequent VARCHAR(200) NOT NULL COMMENT '后项（结果）',
  /* 示例："{耳机}" */
  
  -- 统计指标
  support DECIMAL(5,4) NOT NULL COMMENT '支持度',
  confidence DECIMAL(5,4) NOT NULL COMMENT '置信度',
  lift DECIMAL(5,2) NOT NULL COMMENT '提升度',
  
  -- 样本数
  sample_count INT NOT NULL COMMENT '支撑该规则的样本数量',
  
  -- 状态
  is_active BOOLEAN DEFAULT true COMMENT '是否激活',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_association_rules_support ON association_rules(support DESC);
CREATE INDEX idx_association_rules_confidence ON association_rules(confidence DESC);
CREATE INDEX idx_association_rules_lift ON association_rules(lift DESC);
CREATE INDEX idx_association_rules_is_active ON association_rules(is_active);
```

---

## 🔍 三、视图设计

### 3.1 v_customer_summary (客户汇总视图)

```sql
CREATE VIEW v_customer_summary AS
SELECT 
  c.id,
  c.name,
  c.level,
  c.city,
  c.total_assets,
  c.rfm_total,
  COUNT(DISTINCT tr.id) AS recommendation_count,
  COUNT(DISTINCT CASE WHEN tr.status = 'accepted' THEN tr.id END) AS accepted_count,
  MAX(tr.created_at) AS last_recommended_at
FROM customers c
LEFT JOIN tag_recommendations tr ON c.id = tr.customer_id
GROUP BY c.id, c.name, c.level, c.city, c.total_assets, c.rfm_total;
```

### 3.2 v_engine_statistics (引擎统计视图)

```sql
CREATE VIEW v_engine_statistics AS
SELECT 
  source AS engine_name,
  COUNT(*) AS total_recommendations,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_count,
  ROUND(AVG(confidence), 4) AS avg_confidence,
  ROUND(
    COUNT(CASE WHEN status = 'accepted' THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) AS acceptance_rate
FROM tag_recommendations
GROUP BY source;
```

---

## 📈 四、数据字典

### 4.1 枚举类型定义

| 字段名 | 枚举值 | 说明 |
|--------|--------|------|
| **level** | BRONZE, SILVER, GOLD, PLATINUM, DIAMOND | 客户等级 |
| **riskLevel** | LOW, MEDIUM, HIGH | 风险等级 |
| **status** | pending, accepted, rejected | 推荐状态 |
| **source** | rule, clustering, association, fusion | 引擎来源 |
| **initialization_method** | random, kmeans++ | K-Means 初始化方法 |
| **distance_metric** | euclidean, manhattan, cosine | 距离度量 |

### 4.2 核心业务规则

```sql
-- 规则 1: VIP 客户自动升级为 GOLD 等级
CREATE OR REPLACE FUNCTION upgrade_vip_level()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_vip = true AND OLD.level IN ('BRONZE', 'SILVER') THEN
    NEW.level := 'GOLD';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_upgrade_vip
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION upgrade_vip_level();

-- 规则 2: 自动计算 RFM 五分位排名
CREATE OR REPLACE FUNCTION calculate_rfm_scores()
RETURNS VOID AS $$
BEGIN
  -- R  score: 最近消费时间
  UPDATE customers SET r_score = NTILE(5) OVER (ORDER BY last_transaction_at DESC);
  
  -- F  score: 消费频率
  UPDATE customers SET f_score = NTILE(5) OVER (ORDER BY transaction_count DESC);
  
  -- M  score: 消费金额
  UPDATE customers SET m_score = NTILE(5) OVER (ORDER BY total_assets DESC);
END;
$$ LANGUAGE plpgsql;
```

---

## 🔒 五、安全与权限

### 5.1 角色定义

```sql
-- 创建角色
CREATE ROLE app_admin;      -- 管理员：所有权限
CREATE ROLE app_operator;   -- 操作员：CRUD + 推荐
CREATE ROLE app_viewer;     -- 观察者：只读

-- 授权
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON customers, tag_recommendations TO app_operator;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_viewer;
```

### 5.2 行级安全策略 (RLS)

```sql
-- 启用 RLS
ALTER TABLE tag_recommendations ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能查看自己创建的推荐
CREATE POLICY user_own_recommendations ON tag_recommendations
  FOR SELECT
  USING (created_by = current_setting('app.current_user_id')::INT);
```

---

## 📊 六、性能优化

### 6.1 物化视图

```sql
-- 客户统计物化视图（每日刷新）
CREATE MATERIALIZED VIEW mv_daily_customer_stats AS
SELECT 
  DATE(created_at) AS stat_date,
  COUNT(*) AS new_customers,
  AVG(total_assets) AS avg_assets,
  COUNT(CASE WHEN level = 'GOLD' THEN 1 END) AS gold_count
FROM customers
GROUP BY DATE(created_at);

-- 刷新策略
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_customer_stats;
```

### 6.2 分区表（未来扩展）

```sql
-- 当 tag_recommendations 超过 1000 万行时考虑分区
CREATE TABLE tag_recommendations_partitioned (
  LIKE tag_recommendations INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 按月分区
CREATE TABLE tag_rec_2026_03 PARTITION OF tag_recommendations_partitioned
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

---

## 📚 七、参考资源

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [TypeORM 最佳实践](https://typeorm.io/)
- [设计规范 - 数据库设计](../standards/DESIGN_GUIDELINES.md#七数据库设计规范)

---

**文档版本**: v1.0  
**编制人**: [待填写]  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
