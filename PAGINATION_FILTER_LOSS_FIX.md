# 分页筛选条件丢失 Bug 修复

**修复时间**: 2026-03-27 20:15  
**Bug 严重程度**: 🔴 **高** - 影响核心功能  
**状态**: ✅ **已修复**  

---

## 🐛 **问题描述**

### 现象
在推荐结果管理页面，当使用筛选条件（如"待处理"状态）后：
1. 第 1 页显示正确（筛选后的结果）
2. 点击第 2 页 → ❌ **显示所有记录的第 2 页**（筛选条件丢失）
3. 点击第 3 页 → ❌ **显示所有记录的第 3 页**（筛选条件丢失）

### 影响
- 用户无法正确浏览筛选后的多页数据
- 分页功能形同虚设
- 数据展示混乱，可能导致误操作

---

## 🔍 **根本原因**

### 问题代码

**文件**: `frontend/src/pages/Recommendation/RecommendationList/index.tsx`

**位置**: `handleTableChange` 函数（第 458-468 行）

```typescript
// ❌ 错误实现（修复前）
const handleTableChange = (pagination: any, filters: any, sorter: any) => {
  loadRecommendations({
    page: pagination.current,
    limit: pagination.pageSize,
    // ❌ 只传递了分页参数，没有筛选条件！
  });
};
```

### 问题分析

1. **参数不完整**: 只传递了 `page` 和 `limit`
2. **筛选条件丢失**: 没有包含 `status`、`customerName`、`category` 等筛选条件
3. **后端行为**: 后端收到 `GET /recommendations?page=2&limit=20`（无筛选条件），返回所有记录的第 2 页

### 执行流程对比

#### 修复前（错误）
```
用户操作：点击第 2 页
   ↓
前端发送：GET /recommendations?page=2&limit=20
   ↓
后端查询：SELECT * FROM tag_recommendations LIMIT 20 OFFSET 20
   ↓
返回结果：所有记录的第 2 页（❌ 筛选条件丢失）
```

#### 修复后（正确）
```
用户操作：点击第 2 页（当前筛选：status=pending）
   ↓
前端发送：GET /recommendations?page=2&limit=20&status=pending
   ↓
后端查询：SELECT * FROM tag_recommendations WHERE status='pending' LIMIT 20 OFFSET 20
   ↓
返回结果：待处理记录的第 2 页（✅ 筛选条件保留）
```

---

## ✅ **修复方案**

### 修改内容

**文件**: `frontend/src/pages/Recommendation/RecommendationList/index.tsx`

**修改行数**: 第 458-468 行

```typescript
// ✅ 修复后
const handleTableChange = (pagination: any, tableFilters: any, sorter: any) => {
  // 分页时保留所有当前筛选条件
  loadRecommendations({
    page: pagination.current,
    limit: pagination.pageSize,
    ...filters, // 保留表单筛选条件（来自 useState）
  });
};
```

### 关键改进

1. **重命名参数**: `filters` → `tableFilters`，避免与状态变量冲突
2. **展开筛选状态**: 使用 `...filters` 展开所有当前筛选条件
3. **完整参数传递**: 同时包含分页参数和筛选条件

---

## 📊 **筛选条件映射**

### filters 状态包含的字段

```typescript
interface FilterState {
  customerName?: string;      // 客户名称
  tagCategory?: string;       // 标签类别
  dateRange?: any[];          // 日期范围
  status?: string;            // 状态（pending/accepted/rejected）
  source?: string;            // 推荐来源
  minConfidence?: number;     // 最低置信度
}
```

### 分页时传递的参数

当用户设置了筛选条件并点击第 2 页时：

```javascript
// filters 状态
{
  status: 'pending',
  source: 'rule',
  customerName: '张三'
}

// loadRecommendations 接收的参数
{
  page: 2,
  limit: 20,
  status: 'pending',        // ✅ 保留
  source: 'rule',           // ✅ 保留
  customerName: '张三'      // ✅ 保留
}
```

---

## 🧪 **测试验证**

### 测试场景 1：状态筛选 + 分页

```
步骤：
1. 进入"推荐结果管理"
2. 选择"状态：待处理"
3. 观察第 1 页 → ✅ 显示待处理记录
4. 点击第 2 页 → ✅ 应该仍显示待处理记录
5. 查看 Network 请求 → ✅ 应该包含 status=pending 参数
```

**预期结果**:
- ✅ 第 2 页只显示待处理记录
- ✅ 总数 = 待处理记录总数
- ✅ URL 参数：`?page=2&status=pending`

### 测试场景 2：客户搜索 + 分页

```
步骤：
1. 搜索客户名称："张三"
2. 观察第 1 页 → ✅ 显示张三的记录
3. 点击第 2 页 → ✅ 应该仍显示张三的记录
4. 查看 Network 请求 → ✅ 应该包含 customerName=张三 参数
```

**预期结果**:
- ✅ 第 2 页只显示张三的记录
- ✅ 筛选条件未丢失

### 测试场景 3：组合筛选 + 分页

```
步骤：
1. 设置组合筛选：
   - 状态：待处理
   - 来源：规则引擎
   - 客户名称：张
2. 点击第 3 页
3. 查看 Network 请求
```

**预期 Network 参数**:
```
GET /recommendations?page=3&limit=20&status=pending&source=rule&customerName=张
```

---

## 📋 **验收清单**

- [x] **代码修复完成**
- [x] **TypeScript 编译通过**
- [ ] **前端测试通过**（需要你在浏览器中测试）
  - [ ] 状态筛选 + 分页
  - [ ] 客户搜索 + 分页
  - [ ] 组合筛选 + 分页
  - [ ] 清除筛选后分页（应返回所有记录）

---

## 🔍 **相关问题排查**

### 如果测试仍然失败

#### 检查点 1：Network 请求参数

打开开发者工具 → Network 标签 → 点击分页：

**应该看到**:
```
Query String Parameters:
  page: 2
  limit: 20
  status: pending      ← 必须有！
  customerName: 张三    ← 如果有筛选
```

**如果没看到筛选参数**:
- 代码未热更新 → 强制刷新浏览器（Ctrl+Shift+R）
- 代码修改未生效 → 检查前端终端是否有 HMR 更新日志

#### 检查点 2：filters 状态是否正确

在 Console 中执行：
```javascript
// 查看当前筛选状态
console.log('Filters:', filters);
```

应该看到当前的筛选条件对象。

---

## 📁 **修改文件清单**

### 修改的文件
1. `frontend/src/pages/Recommendation/RecommendationList/index.tsx`
   - 修改 `handleTableChange` 函数
   - 重命名参数避免冲突
   - 添加筛选条件展开

### 新增的文档
1. `PAGINATION_FILTER_LOSS_FIX.md`（本文档）

---

## 🎯 **经验教训**

### 教训
在实现分页功能时，**必须同时传递筛选条件**，否则：
- 分页数据不一致
- 用户体验差
- 可能导致误操作

### 最佳实践
1. **分页函数必须包含筛选条件**:
   ```typescript
   loadRecommendations({
     page,
     limit,
     ...filters, // 永远不要忘记！
   });
   ```

2. **使用独立变量名**:
   - 避免参数名与状态变量同名
   - 如：`tableFilters` vs `filters`

3. **测试覆盖**:
   - 必须测试"筛选 + 分页"的组合场景
   - 不能只测试空筛选的分页

---

## 🚀 **下一步**

### 立即测试
1. **清除浏览器缓存**（Ctrl+Shift+R）
2. **登录系统**（business_user / Business123）
3. **进入"推荐结果管理"**
4. **执行测试**：
   - 选择"待处理"状态
   - 如果有超过 20 条待处理记录，点击第 2 页
   - 验证是否仍显示待处理记录

### 验证成功标志
- ✅ 第 2 页只显示待处理记录
- ✅ Network 请求包含 `status=pending` 参数
- ✅ 总数与第 1 页一致

---

**代码已热更新！** 🎉

**请立即在浏览器中测试分页功能！**
