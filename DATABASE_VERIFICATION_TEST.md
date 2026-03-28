# 批量拒绝功能 - 数据库验证测试

**创建时间**: 2026-03-27 19:45  
**状态**: 🔍 **需要验证数据库实际状态**  

---

## 🎯 问题现状

### 用户报告
- ✅ 前端显示成功消息
- ✅ 后端返回 `{ success: 2, total: 2 }`
- ❌ 刷新页面后记录仍然是"待处理"状态
- ❌ 数据库中的 `feedback_reason` 字段可能为 NULL

### 可能的根本原因

#### 假设 1: 后端没有真正保存 feedback_reason
**验证方法**: 直接查询数据库
```sql
SELECT id, is_accepted, feedback_reason 
FROM tag_recommendations 
WHERE id IN (1, 2);
```

**预期结果**:
- 如果已拒绝：`is_accepted=false, feedback_reason='xxx'`
- 如果未更新：`is_accepted=false, feedback_reason=NULL`

---

#### 假设 2: 前端查询条件包含了已拒绝的记录
**验证方法**: 检查 Network 面板中的请求参数

**场景 A**: 如果请求是 `GET /recommendations?isAccepted=false`
- 会返回所有 `is_accepted=false` 的记录
- 包括"待处理"和"已拒绝"
- **无法区分！**

**场景 B**: 如果请求是 `GET /recommendations`（无参数）
- 会返回所有记录
- 应该能看到已接受的记录也混在其中

---

## 🔧 立即验证步骤

### 第一步：数据库验证（必须）

请执行以下 SQL 查询（使用 psql、DBeaver 或其他工具）：

```sql
-- 查看最近的推荐记录
SELECT 
  id, 
  customer_id, 
  is_accepted, 
  feedback_reason, 
  created_at,
  updated_at
FROM tag_recommendations
ORDER BY id DESC
LIMIT 10;
```

**重点关注**:
1. ID 为 1 和 2 的记录（您刚才拒绝的）
2. `is_accepted` 的值
3. `feedback_reason` 的值

---

### 第二步：前端 Network 验证

1. 打开浏览器开发者工具（F12）
2. 切换到 **Network** 标签
3. 清空历史
4. 刷新推荐结果管理页面
5. 找到 `GET /api/v1/recommendations?...` 请求
6. 查看 **Query String Parameters**:
   ```
   page: 1
   limit: 20
   isAccepted: ???  ← 关键！这个值是什么？
   ```

---

### 第三步：后端日志验证

如果您能看到后端日志，请查找：
```
Recommendation X rejected by user 1
```

如果没有这条日志，说明后端根本没有执行拒绝操作！

---

## 💡 临时解决方案

### 方案 A: 修改后端查询逻辑（推荐）

在后端 Service 中添加一个新的查询方法，专门查询"待处理"记录：

```typescript
// recommendation.service.ts
async findPendingRecommendations(
  options: GetRecommendationsDto
): Promise<PaginatedResponse<TagRecommendation>> {
  const queryBuilder = this.recommendationRepo.createQueryBuilder('rec');
  
  // 只查询待处理：isAccepted=false AND feedbackReason IS NULL
  queryBuilder.andWhere('rec.isAccepted = :isAccepted', { isAccepted: false });
  queryBuilder.andWhere('rec.feedbackReason IS NULL');
  
  // ... 其他筛选条件
  
  return new PaginatedResponse(data, total, page, limit);
}
```

---

### 方案 B: 修改前端查询参数

前端在加载"待处理"列表时，明确传递筛选条件：

```typescript
// 不推荐，因为后端无法区分
loadRecommendations({ isAccepted: false });
```

---

### 方案 C: 添加 status 枚举字段（最佳实践）

长期解决方案是修改数据库结构：

```sql
ALTER TABLE tag_recommendations 
ADD COLUMN status VARCHAR(20) DEFAULT 'pending';

-- 更新现有记录
UPDATE tag_recommendations 
SET status = CASE 
  WHEN is_accepted = true THEN 'accepted'
  WHEN feedback_reason IS NOT NULL THEN 'rejected'
  ELSE 'pending'
END;
```

然后修改实体类和所有查询逻辑。

---

## 📊 测试结果记录

### 数据库查询结果
```
（请粘贴 SQL 查询结果）
```

### Network 请求参数
```
（请粘贴 Query String Parameters）
```

### 后端日志
```
（请粘贴相关日志）
```

---

**下一步**: 根据验证结果确定修复方案
