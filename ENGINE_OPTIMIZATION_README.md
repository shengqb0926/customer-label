# 🚀 智能推荐系统引擎优化 - 使用指南

## 📋 概述

本次优化完成了智能推荐系统三大引擎的数据依赖、特征工程和性能优化工作，使系统达到生产就绪状态。

---

## ✅ 完成的任务

### 1. 关联引擎数据依赖（高优先级）
- ✅ 创建客户标签实体和数据库表
- ✅ 实现真实标签数据获取逻辑
- ✅ 支持关联规则挖掘的数据需求

### 2. 聚类引擎特征工程（中优先级）
- ✅ 实现 Min-Max 归一化处理
- ✅ 添加批量特征提取方法
- ✅ 支持动态统计和自适应归一化

### 3. 性能优化（低优先级）
- ✅ 关联引擎添加数据过滤机制
- ✅ 实现随机采样算法
- ✅ 添加性能优化参数配置

---

## 🎯 快速开始

### 前置条件

确保以下服务正在运行：
- PostgreSQL 数据库
- Redis 缓存服务
- NestJS 后端服务

### 步骤 1: 初始化客户标签数据

**方式 A: 使用 PowerShell 脚本（推荐）**
```powershell
.\scripts\init-customer-tags.ps1
```

**方式 B: 手动执行 SQL**
```bash
psql -U postgres -d customer-label -f scripts/create-customer-tags-table.sql
```

**方式 C: 在数据库中直接执行**
打开 `scripts/create-customer-tags-table.sql` 并在 PostgreSQL 客户端中执行

### 步骤 2: 验证数据库初始化

```sql
-- 检查标签数据量
SELECT COUNT(*) as total_tags, 
       COUNT(DISTINCT customer_id) as customers_with_tags,
       COUNT(DISTINCT tag_name) as unique_tags 
FROM customer_tags;
```

预期结果：
- `total_tags`: > 0
- `customers_with_tags`: > 0
- `unique_tags`: > 0

### 步骤 3: 重启后端服务

```bash
# 停止当前运行的服务（Ctrl+C）

# 清理并重新编译
npm run build

# 启动所有服务
npm run dev:all
```

等待看到以下日志表示启动成功：
```
[Nest] XXXXX  - MM/DD/YYYY, HH:MM:SS AM     LOG [NestFactory] Starting...
[Nest] XXXXX  - MM/DD/YYYY, HH:MM:SS AM     LOG [NestApplication] Application started successfully!
```

### 步骤 4: 测试功能

#### 测试关联引擎
```bash
node test-association-engine.js
```

**预期输出**:
```
🔍 开始测试关联引擎...

📊 步骤 1: 检查客户标签数据...
✅ 找到 XX 条标签记录
✅ 覆盖 XX 个客户
✅ 包含 XX 个唯一标签

📋 步骤 2: 查看示例客户标签...
  客户 XXX (ID: XXX):
    - 高价值客户 (价值分层)
    - 活跃客户 (活跃状态)

🚀 步骤 3: 测试关联引擎推荐...
✅ 推荐生成完成 (状态：success)

✅ 成功生成 X 条关联推荐:

  1. [XXX 标签]
     置信度：XX.X%
     来源：association
     原因：基于关联规则发现...

✨ 关联引擎测试完成!
```

#### 测试规则引擎
```bash
node test-rule-engine.js
```

**预期输出**:
```
📊 测试结果：
✅ 成功生成 1 条推荐

推荐详情:
- 标签：潜力客户
- 置信度：99.99%
- 总分：9.999
- 来源：rule
- 原因：符合规则表达式...

✨ 规则引擎测试完成!
```

---

## 🔧 配置调优

### 调整关联引擎性能参数

编辑 `src/modules/recommendation/engines/association-engine.service.ts`:

```typescript
export class AssociationEngineService {
  // 最小支持度：降低以发现更多规则，提高以减少计算量
  private minSupport = 0.01;        // 默认 1%
  
  // 最小置信度：提高以保证规则质量
  private minConfidence = 0.6;      // 默认 60%
  
  // 最小提升度：高于 1.0 表示正相关
  private minLift = 1.2;            // 默认 1.2
  
  // 最大事务数：根据服务器内存调整
  private maxTransactions = 10000;  // 默认 1 万
  
  // 最小标签数：过滤标签过少的客户
  private minTransactionSize = 2;   // 默认 2 个
}
```

**调优建议**:
- **小数据集** (< 1K 客户): 降低 `minSupport` 到 0.05，关闭采样
- **中等数据集** (1K-10K): 使用默认值
- **大数据集** (> 10K): 增加 `maxTransactions` 或降低 `minSupport`

### 调整特征归一化范围

编辑 `src/modules/recommendation/recommendation.service.ts`:

```typescript
const featureRanges = [
  { min: 0, max: 5000000 },      // 总资产 - 根据实际数据调整
  { min: 0, max: 200000 },       // 月收入 - 根据实际数据调整
  { min: 0, max: 1000000 },      // 年消费 - 根据实际数据调整
  { min: 0, max: 365 },          // 距上次登录天数
  { min: 0, max: 3650 },         // 注册天数 (10 年)
  { min: 0, max: 500 },          // 订单数
  { min: 0, max: 100 },          // 持有产品数
  { min: 18, max: 100 },         // 年龄
];
```

**调优建议**:
- 分析实际数据的分布（min/max/percentile）
- 将范围设置为 P95 或 P99 分位点，避免异常值影响
- 定期更新范围值以适应数据变化

---

## 📊 监控和诊断

### 查看引擎执行日志

启动服务后，查看控制台输出：

```bash
# 规则引擎日志
[RuleEngineService] Loaded X rules from database
[RuleEngineService] Rule expression parsed successfully
[RuleEngineService] Matched X rules for customer XXX

# 聚类引擎日志
[ClusteringEngineService] K-Means converged after X iterations
[ClusteringEngineService] Found X clusters

# 关联引擎日志
[AssociationEngineService] Mining association rules from X/Y valid transactions
[AssociationEngineService] Generated X high-quality association rules

# 融合引擎日志
[FusionEngineService] Fused X recommendations from Y engines
```

### 检查数据库性能

```sql
-- 查看标签分布
SELECT tag_name, COUNT(*) as usage_count
FROM customer_tags
GROUP BY tag_name
ORDER BY usage_count DESC;

-- 查看客户标签覆盖率
SELECT 
  COUNT(DISTINCT customer_id) * 100.0 / (SELECT COUNT(*) FROM customers) as coverage_percent
FROM customer_tags;

-- 查看索引使用情况
EXPLAIN ANALYZE 
SELECT * FROM customer_tags 
WHERE customer_id = 251;
```

---

## 🐛 故障排查

### 问题 1: 关联引擎测试失败

**错误**: `无法连接到数据库`

**解决方案**:
1. 检查 PostgreSQL 服务是否运行
2. 验证数据库连接配置
3. 确认 `customer_tags` 表已创建

```bash
# 检查表是否存在
psql -U postgres -d customer-label -c "\dt customer_tags"
```

### 问题 2: 没有生成关联推荐

**可能原因**:
1. 客户标签数据不足
2. 阈值设置过高

**解决方案**:
```sql
-- 检查特定客户的标签数
SELECT COUNT(*) FROM customer_tags WHERE customer_id = 251;

-- 如果 < 2，需要为该客户添加更多标签
INSERT INTO customer_tags (customer_id, tag_name, tag_category)
VALUES (251, '测试标签', '测试分类');
```

### 问题 3: 聚类效果不佳

**解决方案**:
1. 调整特征归一化范围
2. 修改 K 值配置
3. 检查数据质量

```typescript
// 在 clustering-config 表中调整
UPDATE clustering_config 
SET k = 5  -- 尝试不同的 K 值
WHERE id = 1;
```

---

## 📈 最佳实践

### 1. 定期更新标签数据

```sql
-- 每月运行一次，根据最新数据更新客户标签
INSERT INTO customer_tags (customer_id, tag_name, tag_category, tagged_at)
SELECT 
  c.id,
  CASE 
    WHEN c.total_assets > 1000000 THEN '高价值客户'
    WHEN c.total_assets > 500000 THEN '潜力客户'
    ELSE '一般保持客户'
  END as tag_name,
  '价值分层' as tag_category,
  NOW() as tagged_at
FROM customers c
WHERE c.id NOT IN (
  SELECT customer_id FROM customer_tags 
  WHERE tag_name IN ('高价值客户', '潜力客户', '一般保持客户')
);
```

### 2. 监控推荐质量

```typescript
// 定期检查推荐转化率
SELECT 
  source,
  COUNT(*) as total_recommendations,
  AVG(confidence) as avg_confidence,
  COUNT(DISTINCT customer_id) as covered_customers
FROM tag_recommendations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY source;
```

### 3. 增量更新策略

对于大数据量场景，实现增量更新：

```typescript
// 仅对新客户重新挖掘
const newCustomers = await customerRepo.find({
  where: { createdAt: MoreThan(lastRunTime) }
});

if (newCustomers.length > 0) {
  await associationEngine.incrementalUpdate(newCustomers);
}
```

---

## 🎓 进阶使用

### 自定义标签类别

```sql
-- 添加新的标签类别
INSERT INTO customer_tags (customer_id, tag_name, tag_category)
VALUES 
  (251, '90 后客户', '人口统计'),
  (251, '北京客户', '地域分布'),
  (251, '高风险偏好', '风险特征');
```

### 批量生成推荐

```typescript
// 为所有活跃客户生成推荐
const activeCustomers = await customerRepo.find({
  where: { isActive: true },
  select: ['id']
});

const customerIds = activeCustomers.map(c => c.id);
await recommendationService.batchGenerate(customerIds);
```

### 导出推荐报告

```typescript
// 导出 CSV 格式的报告
const recommendations = await recommendationRepo.find({
  where: { customerId: In([251, 252, 253]) },
  relations: ['customer']
});

// 转换为 CSV 并保存
```

---

## 📝 常见问题 (FAQ)

### Q1: 客户标签表是否必须？
**A**: 是的，关联引擎依赖客户标签数据进行关联规则挖掘。但规则引擎和聚类引擎可以独立运行。

### Q2: 归一化范围如何确定？
**A**: 建议先分析实际数据分布，使用 P95 分位点作为最大值，P5 作为最小值。可以参考统计结果动态调整。

### Q3: 采样会影响推荐质量吗？
**A**: 随机采样会损失部分信息，但在大数据量下是必要的权衡。建议设置合理的 `maxTransactions` 值（如 10K-50K）。

### Q4: 如何评估推荐效果？
**A**: 可以通过以下方式评估：
- 准确率：推荐标签与客户实际特征的匹配度
- 覆盖率：有多少客户获得了推荐
- 多样性：推荐标签的丰富程度
- 业务指标：点击率、转化率等

---

## 🔗 相关资源

### 文档
- [完整优化报告](./RECOMMENDATION_OPTIMIZATION.md)
- [快速开始指南](./QUICK_START_GUIDE.md)
- [优化总结](./OPTIMIZATION_SUMMARY.md)

### 代码
- [CustomerTag 实体](./src/modules/recommendation/entities/customer-tag.entity.ts)
- [Recommendation Service](./src/modules/recommendation/recommendation.service.ts)
- [Association Engine](./src/modules/recommendation/engines/association-engine.service.ts)

### 外部链接
- [NestJS 官方文档](https://docs.nestjs.com/)
- [TypeORM 文档](https://typeorm.io/)
- [K-Means 算法](https://scikit-learn.org/stable/modules/clustering.html#k-means)
- [Apriori 算法](https://en.wikipedia.org/wiki/Apriori_algorithm)

---

**最后更新**: 2026-03-28  
**维护者**: AI Assistant  
**状态**: ✅ 生产就绪

如有问题，请查阅上述文档或联系开发团队。
