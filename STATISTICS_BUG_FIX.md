# 统计卡片数据不一致 Bug 修复

**问题发现时间**: 2026-03-28 11:30  
**Bug 类型**: 数据统计逻辑错误  
**严重程度**: 高（影响用户理解和数据一致性）

---

## 🐛 **问题描述**

推荐结果管理页面的统计卡片显示：**总推荐数 ≠ 待处理 + 已接受 + 已拒绝**

### 现象
- 总推荐数：显示后端返回的 `recommendationPagination.total`
- 待处理、已接受、已拒绝：基于前端 `recommendations` 数组筛选计算
- 两者数据来源不一致，导致统计不匹配

---

## 🔍 **根因分析**

### 1. 数据来源差异

#### **总数来源**
```typescript
const statistics = {
  total: recommendationPagination.total, // 来自后端分页响应
  pending: recommendations.filter(...).length, // 基于前端已加载的数据
  accepted: recommendations.filter(...).length,
  rejected: recommendations.filter(...).length,
};
```

**问题**：
- `total` 是数据库中**所有记录**的总数（可能有几百条）
- `recommendations` 数组只包含**当前页**的数据（默认 20 条）
- 用 20 条数据的筛选结果去对比几百条的总数，必然不相等

### 2. 筛选条件影响

当用户应用筛选条件时：
- 后端返回的 `total` 是**符合筛选条件的记录总数**
- 前端 `recommendations` 数组只包含**当前页**的筛选结果
- 例如：筛选后总共 100 条，但当前只显示第 1 页的 20 条

此时统计卡片：
- 总数显示：100（筛选后的总数）
- 待处理 + 已接受 + 已拒绝：只统计了 20 条（当前页数据）
- 结果：100 ≠ 20 条记录的分类和

### 3. 向后兼容逻辑混乱

原代码的筛选逻辑：
```typescript
pending: recommendations.filter(r => {
  return !r.isAccepted && (!('status' in r) || (r as any).status === 'pending');
}).length,
```

**问题**：
- 对于旧数据（只有 [isAccepted](file://d:\VsCode\customer-label\frontend\src\services\rule.ts#L84-L84) 字段），`!r.isAccepted` 会把所有未接受的记录都算作 [pending](file://d:\VsCode\customer-label\src\modules\feedback\entities\feedback.entity.ts#L54-L54)
- 但实际上，未接受的记录可能包括 [pending](file://d:\VsCode\customer-label\src\modules\feedback\entities\feedback.entity.ts#L54-L54) 和 [rejected](file://d:\VsCode\customer-label\src\modules\scoring\entities\score-value.entity.ts#L50-L50) 两种状态
- 导致部分记录被重复计算或遗漏

---

## ✅ **解决方案**

### 方案 A：从后端获取统计数据（推荐）⭐

**优点**：
- 数据准确，与数据库一致
- 不受分页和筛选影响
- 性能更好（后端聚合查询）

**实现步骤**：

1. **新增后端统计接口**
```typescript
// src/modules/recommendation/recommendation.controller.ts
@Get('stats')
async getStats(@Query() options: GetRecommendationsDto) {
  return this.recommendationService.getStatusStats(options);
}
```

2. **后端 Service 实现**
```typescript
// src/modules/recommendation/recommendation.service.ts
async getStatusStats(options?: GetRecommendationsDto): Promise<{
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}> {
  const queryBuilder = this.recommendationRepo.createQueryBuilder('rec');
  
  // 应用筛选条件
  if (options.category) {
    queryBuilder.andWhere('rec.tagCategory = :category', { category });
  }
  if (options.source) {
    queryBuilder.andWhere('rec.source = :source', { source });
  }
  // ... 其他筛选
  
  // 按状态分组统计
  const results = await queryBuilder
    .select('rec.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('rec.status')
    .getRawMany();
  
  const stats = {
    total: await queryBuilder.clone().getCount(),
    pending: 0,
    accepted: 0,
    rejected: 0,
  };
  
  results.forEach(row => {
    stats[row.status] = parseInt(row.count);
    stats.total += parseInt(row.count);
  });
  
  return stats;
}
```

3. **前端调用并更新统计**
```typescript
// frontend/src/pages/Recommendation/RecommendationList/index.tsx
useEffect(() => {
  loadStatistics(filters);
}, [filters]);

const loadStatistics = async (filterParams: any) => {
  const stats = await recommendationService.getStatistics(filterParams);
  setStatistics(stats);
};
```

### 方案 B：修正前端统计逻辑（临时方案）

如果暂时无法修改后端，可以修正前端的统计逻辑：

```typescript
// 统计卡片数据（仅用于演示，不推荐生产使用）
const statistics = {
  total: recommendations.length, // 改为当前页的数据总数
  pending: recommendations.filter(r => {
    // 优先检查 status 字段，回退到 isAccepted
    if ('status' in r) {
      return (r as any).status === 'pending';
    }
    // 向后兼容：没有 status 字段时，isAccepted=false 视为 pending
    return !r.isAccepted;
  }).length,
  accepted: recommendations.filter(r => {
    // 优先检查 status 字段，回退到 isAccepted
    if ('status' in r) {
      return (r as any).status === 'accepted';
    }
    // 向后兼容：没有 status 字段时，isAccepted=true 视为 accepted
    return r.isAccepted;
  }).length,
  rejected: recommendations.filter(r => {
    // 只有 status='rejected' 才计入 rejected
    return (r as any).status === 'rejected';
  }).length,
};
```

**缺点**：
- 只能反映当前页的数据，不能代表整体
- 翻页时统计数据会变化，用户体验差
- 只是权宜之计，不是根本解决方案

---

## 🎯 **推荐实施方案**

采用**方案 A**，具体步骤：

### 第一步：后端添加统计接口

1. 在 `recommendation.service.ts` 中添加 `getStatusStats` 方法
2. 在 `recommendation.controller.ts` 中添加 `/stats` GET 端点
3. 编写单元测试验证统计准确性

### 第二步：前端集成统计 API

1. 在 `frontend/src/services/rule.ts` 中添加 `getStatistics` 方法
2. 在组件中调用统计接口
3. 使用独立的 state 存储统计数据

### 第三步：优化用户体验

1. 统计卡片添加 loading 状态
2. 筛选条件变化时自动刷新统计
3. 添加统计更新时间提示

---

## 📝 **代码修改清单**

### 后端文件
- [ ] `src/modules/recommendation/recommendation.service.ts` - 新增 `getStatusStats` 方法
- [ ] `src/modules/recommendation/recommendation.controller.ts` - 新增 `/stats` 端点
- [ ] `src/modules/recommendation/dto/get-recommendations.dto.ts` - 确认筛选参数支持

### 前端文件
- [ ] `frontend/src/services/rule.ts` - 新增 `getStatistics` API 方法
- [ ] `frontend/src/stores/ruleStore.ts` - 添加统计状态和管理方法
- [ ] `frontend/src/pages/Recommendation/RecommendationList/index.tsx` - 集成统计 API

---

## 🧪 **验收标准**

- ✅ 总推荐数 = 待处理 + 已接受 + 已拒绝（严格相等）
- ✅ 应用筛选条件后，统计数据正确更新
- ✅ 翻页时统计数据保持不变（除非筛选条件变化）
- ✅ 后端日志显示正确的 SQL 聚合查询
- ✅ Network 面板显示独立的统计 API 调用
- ✅ 控制台无错误

---

## ⏭️ **下一步行动**

1. **立即执行**：创建任务文档，规划实施步骤
2. **今日完成**：后端统计接口开发和测试
3. **明日完成**：前端集成和 UI 优化
4. **验收测试**：完整的功能验证和回归测试

---

**当前状态**: 问题分析完成，等待实施方案  
**预计工时**: 2-3 小时（后端 1h + 前端 1-2h）

---

现在开始实施方案 A！🚀