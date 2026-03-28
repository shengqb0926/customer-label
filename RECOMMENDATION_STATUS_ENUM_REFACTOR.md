# 推荐状态枚举重构 - 完整报告

**完成时间**: 2026-03-27 20:15  
**状态**: ✅ **数据库迁移完成，代码已修改**  

---

## 🎯 问题背景

### 原始设计缺陷
使用布尔字段 `isAccepted` 无法准确表示三种状态：
- **待处理**: `isAccepted = false` 
- **已接受**: `isAccepted = true`
- **已拒绝**: `isAccepted = false` ⚠️ **与"待处理"冲突！**

### 导致的问题
1. 无法区分"待处理"和"已拒绝"
2. 必须依赖辅助字段 `feedbackReason` 进行判断
3. 查询逻辑复杂且容易出错
4. 前端筛选条件混乱（`isAccepted=false` 会返回待处理和已拒绝）

---

## ✅ 解决方案：枚举类型

### 状态定义

```typescript
export enum RecommendationStatus {
  PENDING = 'pending',      // 待处理
  ACCEPTED = 'accepted',    // 已接受
  REJECTED = 'rejected',    // 已拒绝
}
```

### 数据库表结构变更

#### 新增字段
- `status` (recommendation_status ENUM) - 主状态字段

#### 保留字段（向后兼容）
- `isAccepted` (BOOLEAN, nullable) - 保留用于向后兼容

### 状态映射关系

| 状态 | status | isAccepted | feedback_reason |
|------|--------|------------|-----------------|
| **待处理** | `pending` | `false` | `NULL` |
| **已接受** | `accepted` | `true` | `可选` |
| **已拒绝** | `rejected` | `false` | `非 NULL` |

---

## 📝 修改清单

### 1. 后端实体类

**文件**: `src/modules/recommendation/entities/tag-recommendation.entity.ts`

**变更**:
- ✅ 添加 `RecommendationStatus` 枚举定义
- ✅ 添加 `status` 字段（enum 类型）
- ✅ 修改 `isAccepted` 为 nullable（向后兼容）
- ✅ 索引从 `isAccepted` 改为 `status`

```typescript
@Column({ type: 'enum', enum: RecommendationStatus, default: RecommendationStatus.PENDING })
status: RecommendationStatus;

@Column({ type: 'boolean', default: false, nullable: true })
isAccepted: boolean; // 向后兼容
```

---

### 2. 后端 Service 层

**文件**: `src/modules/recommendation/recommendation.service.ts`

**变更**:
- ✅ 导入 `RecommendationStatus` 枚举
- ✅ `acceptRecommendation()` 方法：设置 `status = ACCEPTED`
- ✅ `rejectRecommendation()` 方法：设置 `status = REJECTED`
- ✅ `findAllWithPagination()` 方法：支持 `status` 参数筛选

```typescript
async acceptRecommendation(id: number, userId: number, ...) {
  recommendation.status = RecommendationStatus.ACCEPTED;
  recommendation.isAccepted = true; // 向后兼容
  // ...
}

async rejectRecommendation(id: number, userId: number, feedbackReason?: string) {
  recommendation.status = RecommendationStatus.REJECTED;
  recommendation.isAccepted = false; // 向后兼容
  recommendation.feedbackReason = feedbackReason;
  // ...
}
```

---

### 3. 后端 DTO

**文件**: `src/modules/recommendation/dto/get-recommendations.dto.ts`

**变更**:
- ✅ 导入 `RecommendationStatus` 枚举
- ✅ 添加 `status` 参数（枚举类型）
- ✅ 保留 `isAccepted` 参数（标记为 deprecated）

```typescript
@ApiPropertyOptional({
  description: '按状态筛选',
  enum: RecommendationStatus,
  example: 'pending',
})
@IsOptional()
@IsEnum(RecommendationStatus)
status?: RecommendationStatus;

@ApiPropertyOptional({
  description: '是否已接受（向后兼容）',
  deprecated: true,
})
@IsOptional()
isAccepted?: boolean | string;
```

---

### 4. 前端组件

**文件**: `frontend/src/pages/Recommendation/RecommendationList/index.tsx`

**变更**:
- ✅ `handleStatusChange()` 方法：直接传递 `status` 参数
- ✅ `handleQuery()` 方法：使用 `status` 而不是 `isAccepted`

```typescript
// 旧代码（已废弃）
const isAccepted = value === 'accepted' ? true : (value === 'pending' ? false : undefined);
loadRecommendations({ isAccepted });

// 新代码（推荐）
loadRecommendations({ status: value || undefined });
```

---

### 5. 数据库迁移

**文件**: `src/modules/recommendation/migrations/add-status-enum.sql`

**执行内容**:
```sql
-- 创建枚举类型
CREATE TYPE recommendation_status AS ENUM ('pending', 'accepted', 'rejected');

-- 添加字段
ALTER TABLE tag_recommendations 
ADD COLUMN status recommendation_status DEFAULT 'pending';

-- 迁移现有数据
UPDATE tag_recommendations 
SET status = CASE 
    WHEN is_accepted = true THEN 'accepted'
    WHEN feedback_reason IS NOT NULL THEN 'rejected'
    ELSE 'pending'
END;

-- 创建索引
CREATE INDEX idx_tag_recommendations_status ON tag_recommendations(status);
```

**执行结果**: ✅ 成功（35 条记录已更新）

---

## 🧪 测试验证

### 第一步：重启后端服务

```bash
cd d:/VsCode/customer-label
npm run start:dev
```

### 第二步：测试单个拒绝

```
1. 登录：business_user / Business123
2. 进入"推荐结果管理"
3. 点击任意一条的"拒绝"按钮
4. 输入原因："测试枚举状态"
5. 确认
6. 观察：
   - ✅ 显示绿色提示："已拒绝推荐"
   - ✅ 列表自动刷新
   - ✅ 该推荐状态变为"已拒绝"
```

### 第三步：测试批量拒绝

```
1. 勾选 2 条"待处理"推荐
2. 点击"批量拒绝"
3. 输入原因："批量测试"
4. 确认
5. 观察：
   - ✅ 显示绿色提示："已成功拒绝 2 条推荐"
   - ✅ 列表自动刷新
   - ✅ 待处理数量减少
```

### 第四步：验证数据库

```sql
SELECT id, status, is_accepted, feedback_reason 
FROM tag_recommendations 
WHERE id IN (你刚才拒绝的 ID)
ORDER BY id;
```

**预期结果**:
```
id | status   | is_accepted | feedback_reason
---|----------|-------------|------------------
1  | rejected | false       | 测试枚举状态
2  | rejected | false       | 批量测试
```

---

## 📊 优势对比

### 旧方案（布尔值）

| 问题 | 影响 |
|------|------|
| ❌ 无法区分待处理和已拒绝 | 查询逻辑复杂 |
| ❌ 依赖辅助字段 | 数据一致性难维护 |
| ❌ 语义不清晰 | 代码可读性差 |
| ❌ 扩展性差 | 未来添加新状态困难 |

### 新方案（枚举）⭐

| 优势 | 说明 |
|------|------|
| ✅ 语义清晰 | `pending/accepted/rejected` 一目了然 |
| ✅ 查询简单 | `WHERE status = 'pending'` 直观准确 |
| ✅ 数据一致 | 单一字段决定状态，无需辅助判断 |
| ✅ 扩展性强 | 轻松添加新状态（如 `processing`） |
| ✅ 向后兼容 | 保留 `isAccepted` 字段不影响旧代码 |

---

## 🔍 常见问题

### Q1: 为什么要保留 isAccepted 字段？
**A**: 向后兼容。现有代码和 API 可能还在使用 `isAccepted`，保留它可以避免破坏性变更。新代码应该使用 `status` 字段。

### Q2: 旧数据如何处理？
**A**: 迁移脚本已自动处理：
- `is_accepted = true` → `status = 'accepted'`
- `feedback_reason IS NOT NULL` → `status = 'rejected'`
- 其他 → `status = 'pending'`

### Q3: 前端如何平滑迁移？
**A**: 前端代码已修改为使用 `status` 参数，但由于后端同时支持 `status` 和 `isAccepted`，所以即使前端还有旧代码也能正常工作。

---

## 📋 验收清单

- [x] **数据库迁移执行成功**
- [x] **实体类添加 status 字段**
- [x] **Service 层使用 status 枚举**
- [x] **DTO 支持 status 参数**
- [x] **前端使用 status 筛选**
- [x] **向后兼容性保留**

**待验证**:
- [ ] 重启后端服务后无编译错误
- [ ] 单个拒绝功能测试通过
- [ ] 批量拒绝功能测试通过
- [ ] 数据库状态字段值正确
- [ ] 前端筛选功能正常工作

---

## 🚀 下一步

### 立即执行
1. **重启后端服务**（如果已停止）
2. **清除浏览器缓存**（Ctrl+Shift+R）
3. **测试拒绝功能**
4. **验证数据库状态**

### 可选优化（未来）
1. 在某个版本后彻底移除 `isAccepted` 字段
2. 添加更多状态（如 `processing`、`expired`）
3. 为 `status` 字段添加数据库约束
4. 更新 Swagger 文档

---

## 📁 相关文件

### 修改的文件
1. `src/modules/recommendation/entities/tag-recommendation.entity.ts`
2. `src/modules/recommendation/recommendation.service.ts`
3. `src/modules/recommendation/dto/get-recommendations.dto.ts`
4. `frontend/src/pages/Recommendation/RecommendationList/index.tsx`

### 新增的文件
1. `src/modules/recommendation/migrations/add-status-enum.sql`

### 文档
1. `RECOMMENDATION_STATUS_ENUM_REFACTOR.md`（本文档）

---

**数据库迁移成功！** 🎉

**现在请重启后端服务并测试拒绝功能！**
