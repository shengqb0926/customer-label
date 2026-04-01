# 数据库设计文档

**项目名称**: 客户标签智能推荐系统  
**版本**: v1.0  
**编制日期**: 2026-03-30  
**最后更新**: 2026-03-30 (Phase 2 完成)  
**数据库版本**: PostgreSQL 14+

---

## 📊 一、ER 图

### 1.1 实体关系总览

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  customers  │       │ tag_recommendations │       │recommendation_rules│
├─────────────┤       ├──────────────────┤       ├─────────────────┤
│ PK id       │◄──┐   │ PK id            │   ┌──►│ PK id           │
│    name     │   │   │ FK customer_id   │───┘   │    name         │
│    email    │   └──►│    tag           │       │    description  │
│    level    │       │    reason        │       │    expression   │
│    city     │       │    source        │       │    priority     │
│    riskLevel│       │    confidence    │       │    enabled      │
│    totalAssets      │    status        │       │    createdAt    │
│    monthlyIncome    │    acceptedAt    │       └─────────────────┘
│    annualSpend      │    rejectedAt    │
│    orderCount       │    createdAt     │       ┌─────────────────┐
│    productCount     │    updatedAt     │       │clustering_configs│
│    tags[]          │                   │       ├─────────────────┤
│    lastPurchaseDate │                   │       │ PK id           │
│    createdAt        │                   │       │    name         │
│    updatedAt        │                   │       │    kValue       │
└─────────────┘       └──────────────────┘       │    maxIterations│
                      ┌──────────────────┐       │    convergence  │
                      │ association_configs│     │    enabled      │
                      ├──────────────────┤       │    createdAt    │
                      │ PK id            │       └─────────────────┘
                      │    name          │
                      │    minSupport    │       ┌─────────────────┐
                      │    minConfidence │       │   users         │
                      │    minLift       │       ├─────────────────┤
                      │    enabled       │       │ PK id           │
                      │    createdAt     │       │    username     │
                      └──────────────────┘       │    password     │
                                                 │    roles[]      │
                                                 │    enabled      │
                                                 └─────────────────┘
```

### 1.2 表关系说明

| 关系 | 类型 | 描述 |
|------|------|------|
| customers → tag_recommendations | 1:N | 一个客户可有多条推荐 |
| recommendation_rules | 独立 | 规则配置表，被引擎引用 |
| clustering_configs | 独立 | 聚类参数配置表 |
| association_configs | 独立 | 关联规则参数配置表 |
| users | 独立 | 系统用户表 |

---

## 📋 二、表结构详细设计（实际实现）

### 2.1 customers (客户信息表)

**实际表结构** (基于 `Customer` Entity):

```sql
CREATE TABLE customers (
  -- 主键 (使用 bigint 支持大数据量)
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  
  -- 基本信息
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  gender VARCHAR(1), -- 'M' | 'F'
  age INTEGER,
  city VARCHAR(100),
  province VARCHAR(100),
  address VARCHAR(100),
  
  -- 客户属性
  level VARCHAR(50) DEFAULT 'BRONZE', 
    -- 枚举：BRONZE | SILVER | GOLD | PLATINUM | DIAMOND
  risk_level VARCHAR(50) DEFAULT 'LOW',
    -- 枚举：LOW | MEDIUM | HIGH
  
  -- 财务指标
  total_assets DECIMAL(12,2) DEFAULT 0,
  monthly_income DECIMAL(12,2) DEFAULT 0,
  annual_spend DECIMAL(12,2) DEFAULT 0,
  
  -- 消费统计
  order_count INTEGER DEFAULT 0,
  product_count INTEGER DEFAULT 0,
  
  -- 标签数组 (PostgreSQL 数组类型)
  tags TEXT[] DEFAULT '{}',
  
  -- 时间戳
  last_purchase_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_customers_level ON customers(level);
CREATE INDEX idx_customers_risk_level ON customers(risk_level);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_city ON customers(city);
CREATE INDEX idx_customers_level_assets ON customers(level, total_assets DESC);

-- 注释
COMMENT ON TABLE customers IS '客户信息表';
COMMENT ON COLUMN customers.id IS '客户 ID (bigint 自增)';
COMMENT ON COLUMN customers.tags IS '客户标签数组';
COMMENT ON COLUMN customers.level IS '客户等级';
COMMENT ON COLUMN customers.risk_level IS '风险等级';
```

**TypeORM Entity**:
```typescript
@Entity('customers')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true })
@Index(['level'])
@Index(['riskLevel'])
@Index(['createdAt'])
export class Customer {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  address: string;

  @Column({ type: 'enum', enum: CustomerLevel, default: CustomerLevel.BRONZE })
  level: CustomerLevel;

  @Column({ type: 'enum', enum: RiskLevel, default: RiskLevel.LOW })
  riskLevel: RiskLevel;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_assets' })
  totalAssets: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'monthly_income' })
  monthlyIncome: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'annual_spend' })
  annualSpend: number;

  @Column({ type: 'int', default: 0, name: 'order_count' })
  orderCount: number;

  @Column({ type: 'int', default: 0, name: 'product_count' })
  productCount: number;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'date', nullable: true, name: 'last_purchase_date' })
  lastPurchaseDate: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // 关联推荐
  @OneToMany(() => TagRecommendation, rec => rec.customer)
  recommendations: TagRecommendation[];
}
```

**数据字典**:

| 字段 | 类型 | 必填 | 默认值 | 说明 | 示例 |
|------|------|------|--------|------|------|
| id | BIGINT | PK | AUTO | 客户 ID | 1000000001 |
| name | VARCHAR(100) | ✅ | - | 客户姓名 | 张三 |
| email | VARCHAR(100) | ❌ | - | 邮箱（唯一） | zhangsan@example.com |
| phone | VARCHAR(20) | ❌ | - | 手机号（唯一） | 13800138000 |
| gender | VARCHAR(1) | ❌ | - | 性别 | M/F |
| age | INT | ❌ | - | 年龄 | 35 |
| city | VARCHAR(100) | ❌ | - | 城市 | 北京市 |
| province | VARCHAR(100) | ❌ | - | 省份 | 北京市 |
| level | ENUM | ✅ | BRONZE | 客户等级 | GOLD |
| riskLevel | ENUM | ✅ | LOW | 风险等级 | MEDIUM |
| totalAssets | DECIMAL(12,2) | ✅ | 0 | 总资产 | 5000000.00 |
| monthlyIncome | DECIMAL(12,2) | ✅ | 0 | 月收入 | 50000.00 |
| annualSpend | DECIMAL(12,2) | ✅ | 0 | 年消费 | 200000.00 |
| orderCount | INT | ✅ | 0 | 订单数 | 50 |
| productCount | INT | ✅ | 0 | 产品数 | 120 |
| tags | TEXT[] | ❌ | [] | 标签数组 | ["高净值","VIP"] |
| lastPurchaseDate | DATE | ❌ | - | 最近购买日期 | 2026-03-15 |
| createdAt | TIMESTAMP | - | NOW | 创建时间 | 2026-01-01 00:00:00 |
| updatedAt | TIMESTAMP | - | NOW | 更新时间 | 2026-03-30 12:00:00 |

**样本数据**:
```sql
INSERT INTO customers (name, email, phone, gender, age, city, province, level, risk_level, total_assets, monthly_income, annual_spend, order_count, product_count, tags, last_purchase_date)
VALUES 
  ('张三', 'zhangsan@example.com', '13800138000', 'M', 35, '北京', '北京市', 'GOLD', 'LOW', 5000000.00, 50000.00, 200000.00, 50, 120, '{"高净值","活跃"}', '2026-03-15'),
  ('李四', 'lisi@example.com', '13900139000', 'F', 28, '上海', '上海市', 'SILVER', 'LOW', 2000000.00, 30000.00, 100000.00, 30, 80, '{"潜力"}', '2026-03-20');
```

---

### 2.2 tag_recommendations (推荐标签表)

**实际表结构** (基于 `TagRecommendation` Entity):

```sql
CREATE TABLE tag_recommendations (
  -- 主键
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  
  -- 外键
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- 推荐内容
  tag VARCHAR(100) NOT NULL,
  reason TEXT,
  
  -- 推荐来源
  source VARCHAR(50) NOT NULL,
    -- RULE_ENGINE | CLUSTERING_ENGINE | ASSOCIATION_ENGINE | FUSION_ENGINE
  
  -- 置信度
  confidence DECIMAL(5,4) DEFAULT 0,
    -- 范围：0.0000 - 1.0000
  
  -- 状态
  status VARCHAR(50) DEFAULT 'PENDING',
    -- PENDING | ACCEPTED | REJECTED
  
  -- 处理时间
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejected_reason TEXT,
  
  -- 元数据
  metadata JSONB,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_tag_rec_customer_id ON tag_recommendations(customer_id);
CREATE INDEX idx_tag_rec_status ON tag_recommendations(status);
CREATE INDEX idx_tag_rec_source ON tag_recommendations(source);
CREATE INDEX idx_tag_rec_created_at ON tag_recommendations(created_at);
CREATE INDEX idx_tag_rec_confidence ON tag_recommendations(confidence DESC);
CREATE INDEX idx_tag_rec_tag ON tag_recommendations(tag);

-- 注释
COMMENT ON TABLE tag_recommendations IS '推荐标签表';
COMMENT ON COLUMN tag_recommendations.source IS '推荐来源引擎';
COMMENT ON COLUMN tag_recommendations.confidence IS '置信度 (0-1)';
COMMENT ON COLUMN tag_recommendations.status IS '推荐状态';
COMMENT ON COLUMN tag_recommendations.metadata IS '元数据 (JSONB)';
```

**TypeORM Entity**:
```typescript
@Entity('tag_recommendations')
@Index(['customer_id'])
@Index(['status'])
@Index(['source'])
@Index(['created_at'])
export class TagRecommendation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer, c => c.recommendations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'varchar', length: 100 })
  tag: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'varchar', length: 50 })
  source: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  confidence: number;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status: string;

  @Column({ type: 'timestamp', nullable: true, name: 'accepted_at' })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'rejected_at' })
  rejectedAt: Date;

  @Column({ type: 'text', nullable: true, name: 'rejected_reason' })
  rejectedReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
```

**数据字典**:

| 字段 | 类型 | 必填 | 默认值 | 说明 | 示例 |
|------|------|------|--------|------|------|
| id | BIGINT | PK | AUTO | 推荐 ID | 1001 |
| customerId | BIGINT | ✅ | - | 客户 ID (外键) | 1 |
| tag | VARCHAR(100) | ✅ | - | 推荐标签 | 高净值客户 |
| reason | TEXT | ❌ | - | 推荐理由 | 总资产超过 500 万 |
| source | VARCHAR(50) | ✅ | - | 引擎来源 | RULE_ENGINE |
| confidence | DECIMAL(5,4) | ✅ | 0 | 置信度 | 0.9500 |
| status | VARCHAR(50) | ✅ | PENDING | 状态 | ACCEPTED |
| acceptedAt | TIMESTAMP | ❌ | - | 接受时间 | 2026-03-30 10:00:00 |
| rejectedAt | TIMESTAMP | ❌ | - | 拒绝时间 | - |
| rejectedReason | TEXT | ❌ | - | 拒绝原因 | 不符合实际 |
| metadata | JSONB | ❌ | - | 元数据 | {"ruleId":1} |
| createdAt | TIMESTAMP | - | NOW | 创建时间 | 2026-03-30 09:00:00 |
| updatedAt | TIMESTAMP | - | NOW | 更新时间 | 2026-03-30 10:00:00 |

**样本数据**:
```sql
INSERT INTO tag_recommendations (customer_id, tag, reason, source, confidence, status, created_at)
VALUES 
  (1, '高净值客户', '总资产超过 500 万', 'RULE_ENGINE', 0.95, 'PENDING', NOW()),
  (1, '理财偏好者', '持有理财产品超过 100 万', 'RULE_ENGINE', 0.88, 'PENDING', NOW()),
  (2, '潜力客户', '年龄<30 且年收入增长快', 'CLUSTERING_ENGINE', 0.72, 'ACCEPTED', NOW());
```

---

### 2.3 recommendation_rules (规则配置表)

**实际表结构** (基于 `RecommendationRule` Entity):

```sql
CREATE TABLE recommendation_rules (
  -- 主键
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  
  -- 规则信息
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- 规则表达式
  expression TEXT NOT NULL,
    -- JavaScript 语法：totalAssets > 5000000 && age < 40
  
  -- 优先级
  priority INTEGER DEFAULT 0,
    -- 数值越大优先级越高
  
  -- 推荐标签
  tags TEXT[] DEFAULT '{}',
  
  -- 状态
  enabled BOOLEAN DEFAULT true,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_rules_enabled ON recommendation_rules(enabled);
CREATE INDEX idx_rules_priority ON recommendation_rules(priority DESC);

-- 注释
COMMENT ON TABLE recommendation_rules IS '推荐规则配置表';
COMMENT ON COLUMN recommendation_rules.expression IS '规则表达式 (JavaScript 语法)';
COMMENT ON COLUMN recommendation_rules.tags IS '触发的标签数组';
```

**样本数据**:
```sql
INSERT INTO recommendation_rules (name, description, expression, tags, priority, enabled)
VALUES 
  ('高净值客户识别', '总资产超过 500 万', 'totalAssets > 5000000', '{"高净值客户"}', 10, true),
  ('年轻潜力客户', '年龄<35 且年收入>50 万', 'age < 35 && annualSpend > 500000', '{"潜力客户"}', 8, true),
  ('流失预警', '90 天未购买', 'lastPurchaseDate < CURRENT_DATE - INTERVAL ''90 days''', '{"流失风险"}', 5, true);
```

---

### 2.4 clustering_configs (聚类配置表)

**实际表结构** (基于 `ClusteringConfig` Entity):

```sql
CREATE TABLE clustering_configs (
  -- 主键
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  
  -- 配置信息
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- 聚类参数
  k_value INTEGER NOT NULL DEFAULT 5,
    -- 聚类数量 (3-10)
  max_iterations INTEGER DEFAULT 100,
    -- 最大迭代次数
  convergence_threshold DECIMAL(10,6) DEFAULT 0.001,
    -- 收敛阈值
  
  -- 距离算法
  distance_metric VARCHAR(50) DEFAULT 'EUCLIDEAN',
    -- EUCLIDEAN | MANHATTAN | COSINE
  
  -- 状态
  enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT false,
    -- 是否当前激活配置
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 注释
COMMENT ON TABLE clustering_configs IS '聚类算法配置表';
COMMENT ON COLUMN clustering_configs.k_value IS '聚类数量 (K 值)';
COMMENT ON COLUMN clustering_configs.is_active IS '是否激活 (同一时间只有一个激活)';
```

**样本数据**:
```sql
INSERT INTO clustering_configs (name, description, k_value, max_iterations, convergence_threshold, distance_metric, is_active)
VALUES 
  ('默认聚类配置', '标准 K-Means 配置', 5, 100, 0.001, 'EUCLIDEAN', true),
  ('精细聚类', '更多分类', 7, 150, 0.0005, 'EUCLIDEAN', false),
  ('快速聚类', '快速迭代', 4, 50, 0.01, 'MANHATTAN', false);
```

---

### 2.5 association_configs (关联规则配置表)

**实际表结构** (基于 `AssociationConfig` Entity):

```sql
CREATE TABLE association_configs (
  -- 主键
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  
  -- 配置信息
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- 阈值参数
  min_support DECIMAL(5,4) DEFAULT 0.1,
    -- 最小支持度 (0.01-0.5)
  min_confidence DECIMAL(5,4) DEFAULT 0.7,
    -- 最小置信度 (0.5-0.95)
  min_lift DECIMAL(5,2) DEFAULT 1.5,
    -- 最小提升度 (>1.0)
  
  -- 状态
  enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT false,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 注释
COMMENT ON TABLE association_configs IS '关联规则配置表';
COMMENT ON COLUMN association_configs.min_support IS '最小支持度';
COMMENT ON COLUMN association_configs.min_confidence IS '最小置信度';
COMMENT ON COLUMN association_configs.min_lift IS '最小提升度';
```

**样本数据**:
```sql
INSERT INTO association_configs (name, description, min_support, min_confidence, min_lift, is_active)
VALUES 
  ('默认关联规则', '标准 Apriori 配置', 0.1, 0.7, 1.5, true),
  ('宽松规则', '降低阈值获取更多规则', 0.05, 0.6, 1.2, false),
  ('严格规则', '提高阈值保证质量', 0.2, 0.8, 2.0, false);
```

---

### 2.6 users (系统用户表)

**实际表结构** (基于 `User` Entity):

```sql
CREATE TABLE users (
  -- 主键
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  
  -- 用户信息
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
    -- bcrypt 加密
  
  -- 角色
  roles TEXT[] DEFAULT '{}',
    -- admin | operator | viewer
  
  -- 状态
  enabled BOOLEAN DEFAULT true,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 注释
COMMENT ON TABLE users IS '系统用户表';
COMMENT ON COLUMN users.password IS 'bcrypt 加密密码';
COMMENT ON COLUMN users.roles IS '角色数组';
```

**样本数据**:
```sql
INSERT INTO users (username, password, roles, enabled)
VALUES 
  ('admin', '$2b$10$...', '{admin,true}', true),
  ('operator1', '$2b$10$...', '{operator}', true);
```

---

## 🔍 三、查询优化

### 3.1 常用查询 SQL

#### 客户列表分页查询
```sql
SELECT 
  id, name, email, level, city, total_assets, 
  annual_spend, order_count, tags, created_at
FROM customers
WHERE level = 'GOLD'
  AND city = '北京'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

#### 待处理推荐列表
```sql
SELECT 
  tr.id, tr.tag, tr.reason, tr.confidence, tr.source,
  c.id as customer_id, c.name as customer_name
FROM tag_recommendations tr
JOIN customers c ON tr.customer_id = c.id
WHERE tr.status = 'PENDING'
ORDER BY tr.confidence DESC, tr.created_at DESC
LIMIT 20 OFFSET 0;
```

#### 推荐统计
```sql
SELECT 
  source,
  status,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM tag_recommendations
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY source, status
ORDER BY source, status;
```

#### RFM 分析查询
```sql
SELECT 
  c.id, c.name,
  EXTRACT(DAY FROM CURRENT_DATE - c.last_purchase_date)::int as recency_days,
  c.order_count as frequency,
  c.annual_spend as monetary,
  CASE 
    WHEN c.total_assets > 5000000 THEN '高净值'
    WHEN c.total_assets > 1000000 THEN '中产'
    ELSE '普通'
  END as segment
FROM customers c
WHERE c.level = 'GOLD'
ORDER BY recency_days ASC;
```

### 3.2 性能优化建议

#### 索引策略
1. **单列索引**: email, phone, level, riskLevel, status
2. **复合索引**: (level, total_assets DESC), (source, status, created_at)
3. **部分索引**: 
   ```sql
   CREATE INDEX idx_pending_rec 
   ON tag_recommendations(created_at DESC) 
   WHERE status = 'PENDING';
   ```

#### 查询优化
1. **避免 SELECT ***: 只查询需要的字段
2. **使用覆盖索引**: 
   ```sql
   -- 好：使用覆盖索引
   SELECT id, name FROM customers WHERE level = 'GOLD';
   
   -- 差：需要回表
   SELECT * FROM customers WHERE level = 'GOLD';
   ```
3. **分页优化**: 使用游标分页代替 OFFSET
   ```sql
   -- 替代方案
   WHERE created_at < :last_seen_timestamp
   ORDER BY created_at DESC
   LIMIT 20;
   ```

#### 分区表（未来规划）
当数据量超过 1000 万时考虑：
```sql
-- 按时间分区
CREATE TABLE tag_recommendations_2026_q1 PARTITION OF tag_recommendations
FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

---

## 📈 四、数据库监控

### 4.1 关键指标

| 指标 | 阈值 | 监控 SQL |
|------|------|---------|
| 连接数 | < 80% | `SELECT count(*) FROM pg_stat_activity;` |
| 慢查询 | > 1s | `pg_stat_statements` 扩展 |
| 锁等待 | > 5s | `pg_locks` 视图 |
| 缓存命中率 | > 95% | `pg_stat_database.blks_hit / blks_read` |
| 表空间 | < 80% | `pg_size_pretty(pg_total_relation_size())` |

### 4.2 日常维护

```sql
-- 定期清理死元组
VACUUM ANALYZE customers;
VACUUM ANALYZE tag_recommendations;

-- 重建索引
REINDEX TABLE customers;

-- 更新统计信息
ANALYZE customers;
```

---

## 🔗 五、参考资料

- [PRD 文档](../requirements/PRD_TEMPLATE.md)
- [系统架构](./SYSTEM_ARCHITECTURE.md)
- [API 设计](./API_DESIGN.md)
- [TypeORM 文档](https://typeorm.io/)
- [PostgreSQL 14 手册](https://www.postgresql.org/docs/14/)

---

**维护记录**:

| 日期 | 维护人 | 变更描述 |
|------|--------|---------|
| 2026-03-30 | AI Assistant | 初始版本，基于实际 Entity 定义编写 |
| - | - | - |

**审批签字**:

- DBA: ________________  日期：__________
- 技术负责人：________________  日期：__________
