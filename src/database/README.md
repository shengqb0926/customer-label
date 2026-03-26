# 数据库迁移文档

## 概述

本文档记录了客户标签智能推荐系统的所有数据库迁移文件。

## 迁移列表

### 1. CreateTagRecommendationsTable (ID: 1711507200000)

**创建时间**: 2026-03-26  
**描述**: 创建标签推荐结果表

**表结构**:
- `id` (BIGINT, PK): 主键，自增
- `customer_id` (INTEGER): 客户 ID，外键关联 customers 表
- `tag_name` (VARCHAR(100)): 推荐的标签名称
- `tag_category` (VARCHAR(50)): 标签分类
- `confidence` (DECIMAL(5,4)): 推荐置信度 (0-1)
- `source` (VARCHAR(20)): 推荐来源 (rule/clustering/association)
- `reason` (TEXT): 推荐理由
- `score_overall` (DECIMAL(5,4)): 综合评分
- `is_accepted` (BOOLEAN): 是否被采纳
- `accepted_at` (TIMESTAMP): 采纳时间
- `accepted_by` (INTEGER): 采纳人 ID
- `modified_tag_name` (VARCHAR(100)): 用户修改后的标签名
- `feedback_reason` (VARCHAR(500)): 反馈原因
- `created_at` (TIMESTAMP): 创建时间
- `expires_at` (TIMESTAMP): 过期时间
- `updated_at` (TIMESTAMP): 更新时间

**索引**:
- `idx_rec_customer`: customer_id 索引
- `idx_rec_source`: source 索引
- `idx_rec_accepted`: is_accepted 索引
- `idx_rec_created`: created_at 索引

**用途**: 存储 AI 生成的标签推荐结果，包括用户反馈

---

### 2. CreateTagScoresTable (ID: 1711507260000)

**创建时间**: 2026-03-26  
**描述**: 创建标签质量评分表

**表结构**:
- `id` (BIGINT, PK): 主键，自增
- `tag_id` (INTEGER, UNIQUE): 标签 ID，外键关联 tags 表
- `tag_name` (VARCHAR(100)): 标签名称
- `coverage_score` (DECIMAL(5,4)): 覆盖率评分 (0-100)
- `coverage_value` (DECIMAL(10,6)): 覆盖率实际值 (0-1)
- `discrimination_score` (DECIMAL(5,4)): 区分度评分 (0-100)
- `discrimination_iv` (DECIMAL(10,6)): IV 值 (信息值)
- `stability_score` (DECIMAL(5,4)): 稳定性评分 (0-100)
- `stability_psi` (DECIMAL(10,6)): PSI 值 (群体稳定性指数)
- `business_value_score` (DECIMAL(5,4)): 业务价值评分 (0-100)
- `business_value_roi` (DECIMAL(10,6)): ROI 提升倍数
- `overall_score` (DECIMAL(5,4)): 综合评分 (0-100)
- `recommendation` (VARCHAR(20)): 推荐等级 (强烈推荐/推荐/中性/不推荐)
- `insights` (TEXT[]): 洞察建议数组
- `last_calculated_at` (TIMESTAMP): 最后计算时间

**索引**:
- `idx_scores_overall`: overall_score 降序索引
- `idx_scores_updated`: last_calculated_at 降序索引

**用途**: 存储标签的质量评分，用于评估标签价值

---

### 3. CreateRecommendationRulesTable (ID: 1711507320000)

**创建时间**: 2026-03-26  
**描述**: 创建推荐规则表

**表结构**:
- `id` (BIGINT, PK): 主键，自增
- `rule_name` (VARCHAR(100), UNIQUE): 规则名称
- `rule_expression` (TEXT): 规则表达式（可执行代码）
- `priority` (INTEGER): 优先级（数字越大优先级越高）
- `tag_template` (JSONB): 标签模板（包含 name, category, baseConfidence 等）
- `is_active` (BOOLEAN): 是否激活
- `hit_count` (BIGINT): 命中次数
- `acceptance_rate` (DECIMAL(5,4)): 采纳率
- `last_hit_at` (TIMESTAMP): 最后命中时间
- `created_at` (TIMESTAMP): 创建时间
- `updated_at` (TIMESTAMP): 更新时间
- `created_by` (INTEGER): 创建人 ID
- `updated_by` (INTEGER): 更新人 ID

**索引**:
- `idx_rules_active`: is_active 部分索引（仅索引活跃规则）
- `idx_rules_priority`: priority 降序索引

**用途**: 存储基于规则的推荐引擎使用的业务规则

---

### 4. CreateClusteringConfigsTable (ID: 1711507380000)

**创建时间**: 2026-03-26  
**描述**: 创建聚类配置表

**表结构**:
- `id` (BIGINT, PK): 主键，自增
- `config_name` (VARCHAR(100)): 配置名称
- `algorithm` (VARCHAR(50)): 算法名称（k-means/dbscan/hierarchical）
- `parameters` (JSONB): 算法参数（如 k, maxIterations 等）
- `feature_weights` (JSONB): 特征权重配置
- `is_active` (BOOLEAN): 是否激活
- `last_run_at` (TIMESTAMP): 最后运行时间
- `last_cluster_count` (INTEGER): 最后一次聚类的簇数量
- `avg_silhouette_score` (DECIMAL(5,4)): 平均轮廓系数

**用途**: 存储聚类算法的配置，支持动态调整参数

---

### 5. CreateFeedbackStatisticsTable (ID: 1711507440000)

**创建时间**: 2026-03-26  
**描述**: 创建反馈统计表

**表结构**:
- `id` (BIGINT, PK): 主键，自增
- `date` (DATE, UNIQUE): 统计日期
- `total_recommendations` (BIGINT): 总推荐数
- `accepted_count` (BIGINT): 采纳数
- `rejected_count` (BIGINT): 拒绝数
- `ignored_count` (BIGINT): 忽略数
- `modified_count` (BIGINT): 修改数
- `avg_confidence` (DECIMAL(5,4)): 平均置信度
- `acceptance_rate` (DECIMAL(5,4)): 采纳率
- `created_at` (TIMESTAMP): 创建时间

**索引**:
- `idx_feedback_date`: date 降序索引

**用途**: 按天统计推荐系统的效果和用户反馈情况

---

## 执行迁移

### 前置条件

1. 安装 PostgreSQL 15+
2. 创建数据库：
```sql
CREATE DATABASE customer_label;
```

3. 安装依赖：
```bash
npm install
```

4. 配置环境变量（创建 `.env` 文件）：
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=customer_label
NODE_ENV=development
```

### 执行迁移

```bash
# 运行所有迁移
npm run migration:run

# 或者使用 TypeORM CLI
npx typeorm-ts-node-esm migration:run -d data-source.ts
```

### 回滚迁移

```bash
# 回滚最后一个迁移
npm run migration:revert

# 或者使用 TypeORM CLI
npx typeorm-ts-node-esm migration:revert -d data-source.ts
```

### 生成新迁移

```bash
# 生成新迁移
npm run migration:generate -- src/database/migrations/CreateNewTable

# 或者使用 TypeORM CLI
npx typeorm-ts-node-esm migration:generate -d data-source.ts src/database/migrations/CreateNewTable
```

---

## 数据库关系图

```
┌──────────────────────┐       ┌──────────────────────┐
│ tag_recommendations  │       │      tags            │
├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │       │ id (PK)              │
│ customer_id (FK)     │◄──────│ name                 │
│ tag_name             │       │ category             │
│ tag_category         │       │ description          │
│ confidence           │       └──────────────────────┘
│ source               │              
│ reason               │       ┌──────────────────────┐
│ score_overall        │       │ recommendation_rules │
│ is_accepted          │       ├──────────────────────┤
│ accepted_at          │       │ id (PK)              │
│ accepted_by          │       │ rule_name            │
│ modified_tag_name    │       │ rule_expression      │
│ feedback_reason      │       │ priority             │
│ created_at           │       │ tag_template (JSONB) │
│ expires_at           │       │ is_active            │
│ updated_at           │       │ hit_count            │
└──────────────────────┘       │ acceptance_rate      │
                               └──────────────────────┘
┌──────────────────────┐
│      tag_scores      │       ┌──────────────────────┐
├──────────────────────┤       │ clustering_configs   │
│ id (PK)              │       ├──────────────────────┤
│ tag_id (FK, UNIQUE)  │       │ id (PK)              │
│ tag_name             │       │ config_name          │
│ coverage_score       │       │ algorithm            │
│ discrimination_score │       │ parameters (JSONB)   │
│ stability_score      │       │ feature_weights      │
│ business_value_score │       │ is_active            │
│ overall_score        │       │ last_run_at          │
│ recommendation       │       └──────────────────────┘
│ insights             │
└──────────────────────┘       ┌──────────────────────┐
                               │feedback_statistics   │
                               ├──────────────────────┤
                               │ id (PK)              │
                               │ date (UNIQUE)        │
                               │ total_recommendations│
                               │ accepted_count       │
                               │ rejected_count       │
                               │ ignored_count        │
                               │ modified_count       │
                               │ avg_confidence       │
                               │ acceptance_rate      │
                               └──────────────────────┘
```

---

## 性能优化建议

### 1. 分区策略

对于 `tag_recommendations` 表，建议按月分区：

```sql
-- 创建分区表
CREATE TABLE tag_recommendations_y2026m03 PARTITION OF tag_recommendations
FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE tag_recommendations_y2026m04 PARTITION OF tag_recommendations
FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
```

### 2. 数据清理

定期清理过期的推荐数据：

```sql
-- 删除 90 天前的推荐数据
DELETE FROM tag_recommendations 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### 3. 统计信息更新

定期更新统计信息：

```sql
ANALYZE tag_recommendations;
ANALYZE tag_scores;
ANALYZE recommendation_rules;
```

---

## 监控查询

### 推荐采纳率统计

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total,
  SUM(CASE WHEN is_accepted = true THEN 1 ELSE 0 END) as accepted,
  ROUND(SUM(CASE WHEN is_accepted = true THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as acceptance_rate
FROM tag_recommendations
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

### 标签评分分布

```sql
SELECT 
  recommendation,
  COUNT(*) as count,
  ROUND(AVG(overall_score), 2) as avg_score,
  ROUND(MIN(overall_score), 2) as min_score,
  ROUND(MAX(overall_score), 2) as max_score
FROM tag_scores
GROUP BY recommendation
ORDER BY avg_score DESC;
```

### 热门规则排行

```sql
SELECT 
  rule_name,
  hit_count,
  acceptance_rate,
  last_hit_at
FROM recommendation_rules
WHERE is_active = true
ORDER BY hit_count DESC
LIMIT 10;
```

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26
