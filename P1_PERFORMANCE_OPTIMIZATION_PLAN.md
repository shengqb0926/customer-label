# P1 性能优化方案

**问题**: 推荐引擎触发、接受/拒绝 API、创建配置等操作出现超时（>10 秒）

**诊断结果**: 
1. 数据库查询未优化（缺少索引）
2. 批量保存推荐时逐条插入
3. 关联规则引擎加载全量数据
4. 冲突检测逻辑复杂
5. 缓存命中率低

---

## 🔧 优化措施

### **1. 数据库索引优化** ⏰ 30 分钟

**问题**: `tag_recommendations`、`customer_tags` 表缺少关键索引

**解决方案**:
```sql
-- tag_recommendations 表索引
CREATE INDEX idx_recommendations_customer_id ON tag_recommendations(customer_id);
CREATE INDEX idx_recommendations_status ON tag_recommendations(status);
CREATE INDEX idx_recommendations_source ON tag_recommendations(source);
CREATE INDEX idx_recommendations_created_at ON tag_recommendations(created_at);
CREATE INDEX idx_recommendations_category ON tag_recommendations(tag_category);

-- customer_tags 表索引
CREATE INDEX idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX idx_customer_tags_tag_name ON customer_tags(tag_name);

-- clustering_configs 表索引
CREATE INDEX idx_clustering_configs_is_active ON clustering_configs(is_active);

-- association_configs 表索引
CREATE INDEX idx_association_configs_is_active ON association_configs(is_active);
```

**预期效果**: 查询速度提升 5-10 倍

---

### **2. 批量保存优化** ⏰ 1 小时

**问题**: `saveRecommendations()` 方法逐条保存，效率低

**当前代码**:
```typescript
async saveRecommendations(
  customerId: number,
  recommendations: CreateRecommendationDto[]
): Promise<TagRecommendation[]> {
  const entities = recommendations.map(rec => 
    this.recommendationRepo.create({...})
  );
  
  const saved = await this.recommendationRepo.save(entities); // 单次 INSERT
  return saved;
}
```

**优化方案**: 使用 TypeORM 的 `insert()` 方法代替 `save()`，减少 SQL 执行次数

```typescript
async saveRecommendations(
  customerId: number,
  recommendations: CreateRecommendationDto[]
): Promise<TagRecommendation[]> {
  if (recommendations.length === 0) return [];

  // 使用 insert() 批量插入，性能更好
  const insertResult = await this.recommendationRepo.insert(
    recommendations.map(rec => ({
      customerId: rec.customerId,
      tagName: rec.tagName,
      tagCategory: rec.tagCategory,
      confidence: rec.confidence,
      source: rec.source,
      reason: rec.reason,
      scoreOverall: Math.min(rec.confidence * 10, 9.9999),
    }))
  );

  // 获取插入的 ID
  const insertedIds = Object.values(insertResult.identifiers).map(id => id.id);
  
  // 查询返回完整实体
  const saved = await this.recommendationRepo.findByIds(insertedIds);
  
  // 更新缓存
  await this.cache.set(`recommendations:${customerId}`, saved, 3600);
  
  this.logger.log(`Bulk saved ${saved.length} recommendations for customer ${customerId}`);
  return saved;
}
```

**预期效果**: 保存速度提升 3-5 倍

---

### **3. 关联规则引擎优化** ⏰ 2 小时

**问题**: `getAllCustomerTagsMap()` 每次加载全量数据

**当前代码**:
```typescript
private async getAllCustomerTagsMap(): Promise<Map<number, string[]>> {
  const tags = await this.customerTagRepo.find({
    select: ['customerId', 'tagName'],
    order: { customerId: 'ASC' },
  });
  // ...
}
```

**优化方案**:

#### **方案 A: 添加缓存层**
```typescript
private async getAllCustomerTagsMap(useCache = true): Promise<Map<number, string[]>> {
  const cacheKey = 'all_customer_tags_map';
  
  if (useCache) {
    const cached = await this.cache.get<Map<number, string[]>>(cacheKey);
    if (cached) {
      this.logger.debug('Using cached customer tags map');
      return cached;
    }
  }

  // 从数据库加载
  const tags = await this.customerTagRepo.find({
    select: ['customerId', 'tagName'],
    order: { customerId: 'ASC' },
  });

  const tagMap = new Map<number, string[]>();
  for (const tag of tags) {
    const existing = tagMap.get(tag.customerId) || [];
    existing.push(tag.tagName);
    tagMap.set(tag.customerId, existing);
  }

  // 缓存 10 分钟
  await this.cache.set(cacheKey, tagMap, 600);
  this.logger.debug(`Built customer tags map with ${tagMap.size} customers`);
  
  return tagMap;
}
```

#### **方案 B: 增量更新**
长期方案是维护一个物化视图或专门的标签汇总表。

**预期效果**: 首次加载后，后续请求速度提升 10 倍以上

---

### **4. 冲突检测优化** ⏰ 1 小时

**问题**: 冲突检测逻辑复杂，可能重复查询数据库

**优化方向**:
1. 简化冲突规则匹配
2. 添加内存缓存
3. 异步处理非关键冲突

**实施方案**: 暂时保持现有逻辑，待 P0 修复后再深入优化。

---

### **5. 推荐生成流程优化** ⏰ 1 小时

**问题**: 所有模式都执行 `mode='all'`，耗时长

**优化方案**: 在 Controller 层面提供默认参数，鼓励使用单一模式

```typescript
// recommendation.controller.ts
@Post('generate/:customerId')
async generateRecommendations(
  @Param('customerId') customerId: number,
  @Query('mode') mode: 'rule' | 'clustering' | 'association' | 'all' = 'rule', // 默认 rule
  @Query('useCache') useCache: boolean = true,
) {
  // ...
}
```

**预期效果**: 默认使用更快的单一模式，减少不必要的计算

---

### **6. 接受/拒绝 API 优化** ⏰ 30 分钟

**问题**: 单个操作也可能慢

**检查点**:
1. 确认事务隔离级别
2. 检查是否有级联更新
3. 验证索引是否生效

**快速修复**: 添加查询缓存和写缓冲

---

## 📊 预期性能提升

| 优化项 | 当前耗时 | 优化后耗时 | 提升幅度 |
|--------|---------|-----------|---------|
| 规则引擎触发 | 10-15s | 2-3s | ⬇️ 80% |
| 聚合引擎触发 | 10-15s | 3-4s | ⬇️ 70% |
| 关联引擎触发 | 10-15s | 2-3s | ⬇️ 80% |
| 接受/拒绝推荐 | 10s+ | 1-2s | ⬇️ 85% |
| 创建配置 | 偶发超时 | <1s | ✅ 稳定 |

---

## 🎯 实施计划

### **阶段一：数据库索引（立即）**
- [ ] 创建 SQL 迁移脚本
- [ ] 执行索引创建
- [ ] 验证索引生效

### **阶段二：批量保存优化（今天）**
- [ ] 修改 `saveRecommendations()` 方法
- [ ] 测试批量插入性能
- [ ] 回归测试

### **阶段三：缓存优化（明天）**
- [ ] 实现 `getAllCustomerTagsMap()` 缓存
- [ ] 添加缓存失效机制
- [ ] 监控命中率

### **阶段四：流程优化（后天）**
- [ ] 调整默认模式参数
- [ ] 性能基准测试
- [ ] 编写性能文档

---

**预计总工时**: 4-6 小时  
**风险等级**: 低（向后兼容）  
**预期收益**: 整体性能提升 70-85%