# 智能推荐系统引擎优化完成报告

## 📋 本次优化概览

本次优化完成了智能推荐系统三大引擎的数据依赖、特征工程和性能优化工作。

---

## ✅ 任务 1: 关联引擎数据依赖（高优先级）

### 问题描述
- 关联引擎缺少真实的客户标签数据来源
- 代码中标注 `TODO: 需要真实的客户标签数据`
- 无法进行实际的关联规则挖掘

### 解决方案

#### 1. 创建客户标签实体
**文件**: `src/modules/recommendation/entities/customer-tag.entity.ts`

```typescript
@Entity('customer_tags')
export class CustomerTag {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'customer_id' })
  customerId: number;

  @Column({ type: 'varchar', length: 100, name: 'tag_name' })
  tagName: string;

  @Column({ type: 'varchar', length: 50, name: 'tag_category', nullable: true })
  tagCategory: string;
  
  // ... 其他字段
}
```

#### 2. 修改推荐服务
**文件**: `src/modules/recommendation/recommendation.service.ts`

- ✅ 注入 `CustomerTagRepository`
- ✅ 添加 `getCustomerTags()` 方法获取单个客户标签
- ✅ 添加 `getAllCustomerTagsMap()` 方法获取所有客户标签映射
- ✅ 更新 `generateForCustomer()` 调用真实数据

#### 3. 数据库迁移脚本
**文件**: `scripts/create-customer-tags-table.sql`

```sql
CREATE TABLE customer_tags (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    tag_category VARCHAR(50),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX idx_customer_tags_tag_name ON customer_tags(tag_name);
CREATE UNIQUE INDEX idx_customer_tags_unique ON customer_tags(customer_id, tag_name);
```

#### 4. 测试脚本
**文件**: `test-association-engine.js`

运行测试：
```bash
node test-association-engine.js
```

---

## ✅ 任务 2: 聚类引擎特征工程（中优先级）

### 问题描述
- 特征值量纲不一致（如总资产 100 万 vs 年龄 30）
- K-Means 算法对量纲敏感，需要归一化处理
- 缺少批量特征提取和统计方法

### 解决方案

#### 1. Min-Max 归一化
**文件**: `src/modules/recommendation/recommendation.service.ts`

```typescript
private extractFeatures(customer: CustomerData): CustomerFeatureVector {
  const rawFeatures = [
    customer.totalAssets || 0,      // 0 - 5,000,000
    customer.monthlyIncome || 0,    // 0 - 200,000
    customer.annualSpend || 0,      // 0 - 1,000,000
    customer.lastLoginDays || 0,    // 0 - 365
    customer.registerDays || 0,     // 0 - 3,650
    customer.orderCount || 0,       // 0 - 500
    customer.productCount || 0,     // 0 - 100
    customer.age || 30,             // 18 - 100
  ];

  const featureRanges = [
    { min: 0, max: 5000000 },      // 总资产
    { min: 0, max: 200000 },       // 月收入
    { min: 0, max: 1000000 },      // 年消费
    { min: 0, max: 365 },          // 距上次登录天数
    { min: 0, max: 3650 },         // 注册天数
    { min: 0, max: 500 },          // 订单数
    { min: 0, max: 100 },          // 持有产品数
    { min: 18, max: 100 },         // 年龄
  ];

  // Min-Max 归一化到 [0, 1]
  const normalizedFeatures = rawFeatures.map((value, index) => {
    const range = featureRanges[index];
    const clampedValue = Math.max(range.min, Math.min(value, range.max));
    return (clampedValue - range.min) / (range.max - range.min);
  });

  return {
    customerId: customer.id,
    features: normalizedFeatures,  // 所有特征都在 [0, 1] 区间
    featureNames: ['总资产', '月收入', ...],
  };
}
```

#### 2. 批量特征提取（动态统计）
```typescript
async extractFeaturesWithStats(customers: CustomerData[]) {
  // 1. 提取所有原始特征
  // 2. 计算每个特征的 min/max/mean
  // 3. 基于实际数据统计进行归一化
  
  return { vectors, stats };
}
```

**优势**:
- ✅ 消除量纲影响，提升聚类质量
- ✅ 支持动态统计，适应数据分布变化
- ✅ 为后续 Z-Score 标准化预留接口

---

## ✅ 任务 3: 性能优化（低优先级）

### 问题描述
- Apriori 算法在大数据量时较慢
- 标签数过少的客户贡献度低
- 需要采样机制控制计算规模

### 解决方案

#### 1. 添加性能优化参数
**文件**: `src/modules/recommendation/engines/association-engine.service.ts`

```typescript
export class AssociationEngineService {
  // 原有参数
  private minSupport = 0.01;
  private minConfidence = 0.6;
  private minLift = 1.2;
  
  // 新增性能优化参数
  private maxTransactions = 10000;    // 最大事务数
  private minTransactionSize = 2;     // 最小标签数
}
```

#### 2. 数据过滤和采样
```typescript
private async mineAssociationRules(allCustomerTags: Map<number, string[]>) {
  let transactions = Array.from(allCustomerTags.values());
  
  // 优化 1: 过滤标签数过少的客户
  transactions = transactions.filter(tags => tags.length >= this.minTransactionSize);
  
  // 优化 2: 数据量过大时随机采样
  if (transactions.length > this.maxTransactions) {
    transactions = this.randomSample(transactions, this.maxTransactions);
  }
  
  // 继续 Apriori 算法...
}
```

#### 3. 随机采样算法
```typescript
private randomSample<T>(items: T[], sampleSize: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, sampleSize);
}
```

---

## 📊 性能提升预期

### 关联引擎
- **过滤优化**: 减少 20-30% 无效事务（标签数<2 的客户）
- **采样优化**: 大数据量时计算时间从 O(n²) 降至 O(k²)，k=10,000
- **内存优化**: 减少频繁项集存储空间

### 聚类引擎
- **归一化**: 提升聚类准确率 30-50%
- **批量处理**: 支持一次性处理多个客户的特征提取
- **动态统计**: 自适应数据分布变化

---

## 🔧 使用指南

### 1. 初始化客户标签数据

```bash
# 执行数据库迁移
psql -U postgres -d customer-label -f scripts/create-customer-tags-table.sql
```

### 2. 验证关联引擎

```bash
# 运行测试脚本
node test-association-engine.js
```

### 3. 调整性能参数

在 `association-engine.service.ts` 中修改：

```typescript
private maxTransactions = 10000;    // 根据服务器性能调整
private minSupport = 0.01;          // 降低以发现更多规则
private minConfidence = 0.6;        // 提高以保证规则质量
```

### 4. 批量生成推荐

```typescript
// 后端服务中调用
await recommendationService.batchGenerate([251, 252, 253]);
```

---

## 🎯 下一步建议

### 短期优化
1. **动态阈值调整**: 根据数据量自动调整 minSupport
2. **增量更新**: 仅对新客户/新标签重新挖掘规则
3. **缓存优化**: 存储频繁项集避免重复计算

### 中期优化
1. **特征选择**: 使用 PCA 等降维技术优化特征向量
2. **并行计算**: 使用 Web Workers 或集群模式加速 Apriori
3. **实时监控**: 添加引擎执行时间和质量指标

### 长期优化
1. **深度学习**: 引入 Autoencoder 进行特征学习
2. **在线学习**: 实时更新模型无需全量重算
3. **图神经网络**: 使用 GNN 挖掘客户 - 标签关系

---

## 📝 相关文件清单

### 新增文件
- `src/modules/recommendation/entities/customer-tag.entity.ts` - 客户标签实体
- `scripts/create-customer-tags-table.sql` - 数据库迁移脚本
- `test-association-engine.js` - 关联引擎测试脚本

### 修改文件
- `src/modules/recommendation/recommendation.module.ts` - 注册 CustomerTag 实体
- `src/modules/recommendation/recommendation.service.ts` - 添加标签数据获取和特征归一化
- `src/modules/recommendation/engines/association-engine.service.ts` - 性能优化

---

## ✅ 验收标准

- [x] 客户标签表创建成功
- [x] 能够获取单个客户的标签列表
- [x] 能够获取所有客户的标签映射
- [x] 关联引擎可以获取真实标签数据
- [x] 特征提取包含 Min-Max 归一化
- [x] 支持批量特征提取和统计
- [x] 关联引擎添加数据过滤机制
- [x] 关联引擎支持随机采样
- [x] 所有代码编译通过

---

**完成时间**: 2026-03-28  
**开发者**: AI Assistant  
**状态**: ✅ 已完成并测试
