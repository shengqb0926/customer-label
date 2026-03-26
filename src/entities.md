# TypeORM 实体类文档

## 概述

本文档描述了客户标签智能推荐系统中所有 TypeORM 实体类的设计和用法。

---

## 实体列表

### 1. TagRecommendation (标签推荐)

**文件路径**: `src/modules/recommendation/entities/tag-recommendation.entity.ts`  
**对应表**: `tag_recommendations`

#### 属性说明

| 属性 | 类型 | 数据库类型 | 说明 |
|------|------|------------|------|
| id | number | bigint | 主键，自增 |
| customerId | number | int | 客户 ID |
| tagName | string | varchar(100) | 推荐的标签名称 |
| tagCategory | string | varchar(50) | 标签分类 |
| confidence | number | decimal(5,4) | 推荐置信度 (0-1) |
| source | 'rule' \| 'clustering' \| 'association' | varchar(20) | 推荐来源 |
| reason | string | text | 推荐理由 |
| scoreOverall | number | decimal(5,4) | 综合评分 |
| isAccepted | boolean | boolean | 是否被采纳 |
| acceptedAt | Date | timestamp | 采纳时间 |
| acceptedBy | number | int | 采纳人 ID |
| modifiedTagName | string | varchar(100) | 用户修改后的标签名 |
| feedbackReason | string | varchar(500) | 反馈原因 |
| createdAt | Date | timestamp | 创建时间 |
| expiresAt | Date | timestamp | 过期时间 |
| updatedAt | Date | timestamp | 更新时间 |

#### 索引

- `customer_id` 索引
- `source` 索引
- `is_accepted` 索引
- `created_at` 索引

#### 使用示例

```typescript
// 创建推荐记录
const recommendation = new TagRecommendation();
recommendation.customerId = 12345;
recommendation.tagName = '高价值客户';
recommendation.tagCategory = 'value';
recommendation.confidence = 0.95;
recommendation.source = 'rule';
recommendation.reason = '月消费金额 > 10000 元';
recommendation.isAccepted = false;

await recommendationRepository.save(recommendation);

// 查询客户的推荐
const recommendations = await recommendationRepository.find({
  where: { customerId: 12345 },
  order: { confidence: 'DESC' },
  take: 10,
});

// 更新推荐状态（采纳）
recommendation.isAccepted = true;
recommendation.acceptedAt = new Date();
recommendation.acceptedBy = userId;
await recommendationRepository.save(recommendation);
```

---

### 2. TagScore (标签评分)

**文件路径**: `src/modules/scoring/entities/tag-score.entity.ts`  
**对应表**: `tag_scores`

#### 属性说明

| 属性 | 类型 | 数据库类型 | 说明 |
|------|------|------------|------|
| id | number | bigint | 主键，自增 |
| tagId | number | int | 标签 ID（唯一） |
| tagName | string | varchar(100) | 标签名称 |
| coverageScore | number | decimal(5,4) | 覆盖率评分 (0-100) |
| coverageValue | number | decimal(10,6) | 覆盖率实际值 (0-1) |
| discriminationScore | number | decimal(5,4) | 区分度评分 (0-100) |
| discriminationIv | number | decimal(10,6) | IV 值 |
| stabilityScore | number | decimal(5,4) | 稳定性评分 (0-100) |
| stabilityPsi | number | decimal(10,6) | PSI 值 |
| businessValueScore | number | decimal(5,4) | 业务价值评分 (0-100) |
| businessValueRoi | number | decimal(10,6) | ROI 提升倍数 |
| overallScore | number | decimal(5,4) | 综合评分 (0-100) |
| recommendation | '强烈推荐' \| '推荐' \| '中性' \| '不推荐' | varchar(20) | 推荐等级 |
| insights | string[] | text[] | 洞察建议数组 |
| lastCalculatedAt | Date | timestamp | 最后计算时间 |

#### 约束

- `tag_id` 唯一约束

#### 索引

- `overall_score` 降序索引
- `last_calculated_at` 降序索引

#### 使用示例

```typescript
// 创建或更新标签评分
const score = new TagScore();
score.tagId = 100;
score.tagName = '高价值客户';
score.coverageScore = 90;
score.coverageValue = 0.125;
score.discriminationScore = 85;
score.discriminationIv = 0.35;
score.stabilityScore = 80;
score.stabilityPsi = 0.12;
score.businessValueScore = 95;
score.businessValueRoi = 2.5;
score.overallScore = 87.5;
score.recommendation = '强烈推荐';
score.insights = [
  '该标签覆盖 12.5% 的客户，处于理想区间',
  '对高价值客户的识别准确率达 85%',
  '使用该标签的营销活动 ROI 提升 2.5 倍'
];
score.lastCalculatedAt = new Date();

await tagScoreRepository.upsert(score, ['tagId']);

// 查询标签评分
const score = await tagScoreRepository.findOne({ where: { tagId: 100 } });

// 查询评分最高的标签
const topScores = await tagScoreRepository.find({
  order: { overallScore: 'DESC' },
  take: 10,
});
```

---

### 3. RecommendationRule (推荐规则)

**文件路径**: `src/modules/recommendation/entities/recommendation-rule.entity.ts`  
**对应表**: `recommendation_rules`

#### 属性说明

| 属性 | 类型 | 数据库类型 | 说明 |
|------|------|------------|------|
| id | number | bigint | 主键，自增 |
| ruleName | string | varchar(100) | 规则名称（唯一） |
| ruleExpression | string | text | 规则表达式 |
| priority | number | int | 优先级 |
| tagTemplate | object | jsonb | 标签模板 |
| isActive | boolean | boolean | 是否激活 |
| hitCount | number | bigint | 命中次数 |
| acceptanceRate | number | decimal(5,4) | 采纳率 |
| lastHitAt | Date | timestamp | 最后命中时间 |
| createdAt | Date | timestamp | 创建时间 |
| updatedAt | Date | timestamp | 更新时间 |
| createdBy | number | int | 创建人 ID |
| updatedBy | number | int | 更新人 ID |

#### 约束

- `rule_name` 唯一约束

#### 索引

- `is_active` 部分索引（仅索引活跃规则）
- `priority` 降序索引

#### 使用示例

```typescript
// 创建推荐规则
const rule = new RecommendationRule();
rule.ruleName = '高价值客户识别';
rule.ruleExpression = 'customer.monthlyRevenue > 10000 && customer.purchaseFrequency >= 3';
rule.priority = 100;
rule.tagTemplate = {
  name: '高价值客户',
  category: 'value',
  baseConfidence: 0.95,
};
rule.isActive = true;
rule.hitCount = 0;

await ruleRepository.save(rule);

// 查询所有活跃规则（按优先级排序）
const activeRules = await ruleRepository.find({
  where: { isActive: true },
  order: { priority: 'DESC' },
});

// 更新规则命中次数
rule.hitCount += 1;
await ruleRepository.save(rule);
```

---

### 4. ClusteringConfig (聚类配置)

**文件路径**: `src/modules/recommendation/entities/clustering-config.entity.ts`  
**对应表**: `clustering_configs`

#### 属性说明

| 属性 | 类型 | 数据库类型 | 说明 |
|------|------|------------|------|
| id | number | bigint | 主键，自增 |
| configName | string | varchar(100) | 配置名称 |
| algorithm | 'k-means' \| 'dbscan' \| 'hierarchical' | varchar(50) | 算法名称 |
| parameters | object | jsonb | 算法参数 |
| featureWeights | object | jsonb | 特征权重 |
| isActive | boolean | boolean | 是否激活 |
| lastRunAt | Date | timestamp | 最后运行时间 |
| lastClusterCount | number | int | 最后簇数量 |
| avgSilhouetteScore | number | decimal(5,4) | 平均轮廓系数 |
| createdAt | Date | timestamp | 创建时间 |

#### 使用示例

```typescript
// 创建聚类配置
const config = new ClusteringConfig();
config.configName = '客户分群默认配置';
config.algorithm = 'k-means';
config.parameters = {
  k: 8,
  maxIterations: 100,
  convergenceThreshold: 0.001,
  minClusterSize: 10,
};
config.featureWeights = {
  transactionFeatures: 0.4,
  interactionFeatures: 0.3,
  timeFeatures: 0.2,
  otherFeatures: 0.1,
};
config.isActive = true;

await configRepository.save(config);

// 查询活跃配置
const activeConfig = await configRepository.findOne({
  where: { isActive: true },
});
```

---

### 5. FeedbackStatistic (反馈统计)

**文件路径**: `src/modules/feedback/entities/feedback-statistic.entity.ts`  
**对应表**: `feedback_statistics`

#### 属性说明

| 属性 | 类型 | 数据库类型 | 说明 |
|------|------|------------|------|
| id | number | bigint | 主键，自增 |
| date | string | date | 统计日期（唯一） |
| totalRecommendations | number | bigint | 总推荐数 |
| acceptedCount | number | bigint | 采纳数 |
| rejectedCount | number | bigint | 拒绝数 |
| ignoredCount | number | bigint | 忽略数 |
| modifiedCount | number | bigint | 修改数 |
| avgConfidence | number | decimal(5,4) | 平均置信度 |
| acceptanceRate | number | decimal(5,4) | 采纳率 |
| createdAt | Date | timestamp | 创建时间 |

#### 约束

- `date` 唯一约束

#### 使用示例

```typescript
// 创建每日统计
const statistic = new FeedbackStatistic();
statistic.date = '2026-03-26';
statistic.totalRecommendations = 1000;
statistic.acceptedCount = 650;
statistic.rejectedCount = 150;
statistic.ignoredCount = 180;
statistic.modifiedCount = 20;
statistic.avgConfidence = 0.82;
statistic.acceptanceRate = 0.65;

await feedbackRepository.save(statistic);

// 查询最近 30 天的统计数据
const statistics = await feedbackRepository.find({
  order: { date: 'DESC' },
  take: 30,
});

// 计算平均采纳率
const avgAcceptanceRate = statistics.reduce((sum, s) => sum + s.acceptanceRate, 0) / statistics.length;
```

---

## 实体关系图

```
┌──────────────────────┐
│  TagRecommendation   │
├──────────────────────┤
│ id                   │
│ customerId           │
│ tagName              │
│ source               │
│ confidence           │
│ isAccepted           │
│ ...                  │
└──────────────────────┘

┌──────────────────────┐
│      TagScore        │
├──────────────────────┤
│ id                   │
│ tagId (UNIQUE)       │
│ tagName              │
│ overallScore         │
│ recommendation       │
│ insights             │
└──────────────────────┘

┌──────────────────────┐
│ RecommendationRule   │
├──────────────────────┤
│ id                   │
│ ruleName (UNIQUE)    │
│ ruleExpression       │
│ priority             │
│ tagTemplate (JSONB)  │
│ isActive             │
│ hitCount             │
└──────────────────────┘

┌──────────────────────┐
│  ClusteringConfig    │
├──────────────────────┤
│ id                   │
│ configName           │
│ algorithm            │
│ parameters (JSONB)   │
│ featureWeights       │
│ isActive             │
└──────────────────────┘

┌──────────────────────┐
│ FeedbackStatistic    │
├──────────────────────┤
│ id                   │
│ date (UNIQUE)        │
│ totalRecommendations │
│ acceptedCount        │
│ acceptanceRate       │
└──────────────────────┘
```

---

## 最佳实践

### 1. 实体使用规范

- ✅ 使用 TypeScript 强类型定义
- ✅ 明确指定数据库类型和精度
- ✅ 添加适当的索引优化查询
- ✅ 使用装饰器配置实体关系
- ✅ 保持实体类简洁，只包含数据属性

### 2. 数据验证

建议在 Service 层添加数据验证：

```typescript
// 示例：验证推荐置信度
if (recommendation.confidence < 0 || recommendation.confidence > 1) {
  throw new BadRequestException('置信度必须在 0-1 之间');
}

// 示例：验证评分范围
if (score.overallScore < 0 || score.overallScore > 100) {
  throw new BadRequestException('综合评分必须在 0-100 之间');
}
```

### 3. 性能优化

- 使用 `take` 和 `skip` 分页查询
- 使用 `select` 只选择需要的字段
- 批量操作使用 `save()` 数组
- 定期清理过期推荐数据

### 4. 事务处理

涉及多个表的操作时使用事务：

```typescript
const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  await queryRunner.manager.save(recommendation);
  await queryRunner.manager.save(feedbackStatistic);
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

---

## 常见问题

### Q1: 如何更新实体？

```typescript
// 方法 1: 先查询再更新
const entity = await repository.findOne({ where: { id: 1 } });
if (entity) {
  entity.someField = newValue;
  await repository.save(entity);
}

// 方法 2: 使用 upsert（如果支持）
await repository.upsert({ id: 1, someField: newValue }, ['id']);
```

### Q2: 如何处理 JSONB 字段？

TypeORM 会自动序列化和反序列化 JSONB 字段，直接使用对象即可：

```typescript
rule.tagTemplate = {
  name: '高价值客户',
  category: 'value',
  baseConfidence: 0.95,
};
// 保存到数据库时会自动转为 JSONB
```

### Q3: 如何执行复杂查询？

使用 QueryBuilder：

```typescript
const recommendations = await recommendationRepository
  .createQueryBuilder('rec')
  .where('rec.customerId = :customerId', { customerId: 12345 })
  .andWhere('rec.isAccepted = :accepted', { accepted: false })
  .orderBy('rec.confidence', 'DESC')
  .limit(10)
  .getMany();
```

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26
