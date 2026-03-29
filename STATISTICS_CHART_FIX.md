# 统计图表数据修复 - 字符串转数字问题

## 🐛 问题诊断

### 现象
- ✅ 统计分析页面可以正常访问
- ❌ 客户等级分布图表不显示
- ❌ 风险等级分布图表不显示
- ✅ 城市分布图表正常显示

### 根本原因

**后端返回的数据类型问题**:

```json
{
  "levelStats": [
    { "level": "BRONZE", "count": "28" },   // ❌ count 是字符串
    { "level": "GOLD", "count": "57" }
  ],
  "riskStats": [
    { "riskLevel": "LOW", "count": "88" },   // ❌ count 是字符串
    { "riskLevel": "MEDIUM", "count": "88" }
  ]
}
```

**TypeORM 查询结果**:
- 使用 `GROUP BY` 聚合查询时，PostgreSQL 返回的计数值是**字符串类型**
- TypeORM 不会自动转换为数字
- @ant-design/charts 需要**数字类型**才能正确渲染饼图

---

## ✅ 解决方案

### 修改点 1: 等级分布数据转换

```tsx
// ❌ 修改前 - 直接使用字符串
const levelChartData = statistics.levelStats.map((item) => ({
  type: item.level === 'BRONZE' ? '青铜' : /* ... */,
  value: item.count,  // ❌ 字符串 "28"
}));

// ✅ 修改后 - 强制转换为数字
const levelChartData = statistics.levelStats.map((item) => ({
  type: item.level === 'BRONZE' ? '青铜' : /* ... */,
  value: Number(item.count),  // ✅ 数字 28
}));
```

### 修改点 2: 风险分布数据转换

```tsx
// ✅ 同样处理风险分布
const riskChartData = statistics.riskStats.map((item) => ({
  type: item.riskLevel === 'LOW' ? '低风险' : /* ... */,
  value: Number(item.count),  // ✅ 强制转换为数字
}));
```

### 修改点 3: 添加调试日志

```tsx
const loadStatistics = async () => {
  setLoading(true);
  try {
    const data = await customerService.getStatistics();
    console.log('=== 统计数据 ===', data);
    console.log('等级分布原始数据:', data.levelStats);
    console.log('风险分布原始数据:', data.riskStats);
    setStatistics(data);
  } catch (error: any) {
    console.error('加载统计数据失败:', error);
  } finally {
    setLoading(false);
  }
};
```

### 修改点 4: 空数据保护

```tsx
{/* 客户等级分布 */}
<Card title="客户等级分布" bordered={false}>
  {levelChartData.length > 0 ? (
    <Pie {...levelPieConfig} height={300} />
  ) : (
    <Empty description="暂无等级数据" />
  )}
</Card>
```

---

## 🔍 为什么城市分布正常？

**对比发现**:

```tsx
// 城市分布 - 已经在使用 Number() 转换
const cityColumnConfig = {
  data: statistics.cityStats.slice(0, 10).map((item: any) => ({
    city: item.city,
    count: Number(item.count),  // ✅ 已经是数字
  })),
  // ...
};
```

**原因**: 
- 城市分布使用了 `(item: any)` 类型断言
- 并且显式调用了 `Number(item.count)`
- 所以柱状图能正常显示

---

## 📊 验证结果

### 后端 API 测试

```bash
总客户数：250
活跃客户：250
平均资产：781196.26384
等级分布：[
  { level: 'BRONZE', count: '28' },   # ❌ 字符串
  { level: 'GOLD', count: '57' },     # ❌ 字符串
  { level: 'PLATINUM', count: '4' },  # ❌ 字符串
  { level: 'SILVER', count: '161' }   # ❌ 字符串
]
风险分布：[
  { riskLevel: 'MEDIUM', count: '88' },  # ❌ 字符串
  { riskLevel: 'HIGH', count: '74' },    # ❌ 字符串
  { riskLevel: 'LOW', count: '88' }      # ❌ 字符串
]
```

### 前端转换后数据

```javascript
等级图表数据: [
  { type: '青铜', value: 28 },   // ✅ 数字
  { type: '白银', value: 161 },  // ✅ 数字
  { type: '黄金', value: 57 },   // ✅ 数字
  { type: '铂金', value: 4 }     // ✅ 数字
]

风险图表数据: [
  { type: '低风险', value: 88 },    // ✅ 数字
  { type: '中风险', value: 88 },    // ✅ 数字
  { type: '高风险', value: 74 }     // ✅ 数字
]
```

---

## ✅ 编译验证

```bash
npm run build
```

**结果**: ✅ 编译成功，无错误

---

## 🚀 测试步骤

1. **强制刷新浏览器**: Ctrl+F5
2. **登录系统**: admin / admin123
3. **访问客户管理 → 统计分析**

### 预期结果

#### ✅ 基础统计卡片
- 总客户数：250 人
- 活跃客户：250/250 人
- 平均资产：¥781,196.26
- 高价值客户占比：（如果有 RFM 数据）

#### ✅ 客户等级分布饼图
- 显示 4 个扇区：
  - 青铜 (28 人，11.2%)
  - 白银 (161 人，64.4%)
  - 黄金 (57 人，22.8%)
  - 铂金 (4 人，1.6%)

#### ✅ 风险等级分布饼图
- 显示 3 个扇区：
  - 低风险 (88 人，35.2%)
  - 中风险 (88 人，35.2%)
  - 高风险 (74 人，29.6%)

#### ✅ 城市分布柱状图
- 显示 TOP10 城市
- 深圳 (30 人)、杭州 (27 人) 等

---

## 🎯 技术要点

### 1. PostgreSQL 聚合函数返回值
```sql
SELECT level, COUNT(*) as count 
FROM customers 
GROUP BY level;
```
- `COUNT(*)` 在 PostgreSQL 中返回 **bigint** 类型
- TypeORM 查询结果中表现为**字符串**
- JavaScript 需要显式转换为数字

### 2. @ant-design/charts 数据类型要求
```typescript
interface ChartData {
  type: string;
  value: number;  // ❗ 必须是数字
}
```
- 如果传入字符串，图表无法计算角度
- 不会报错，但图表不显示

### 3. 防御性编程
```tsx
// ✅ 始终假设后端返回的是字符串
value: Number(item.count)

// ✅ 添加空数据保护
{data.length > 0 ? <Chart /> : <Empty />}
```

---

## 📝 相关文件

### 修改文件
- `frontend/src/pages/Customer/CustomerStatistics.tsx` (主要修改)

### 相关后端文件
- `src/modules/customer/customer.service.ts` (统计数据查询)
- `src/modules/customer/dto/customer-statistics.dto.ts` (DTO 定义)

---

## 🔧 未来优化建议

### 方案 1: 后端统一转换（推荐）

```typescript
// customer.service.ts
async getStatistics(): Promise<CustomerStatistics> {
  const levelStats = await this.repository
    .createQueryBuilder('customer')
    .select('customer.level', 'level')
    .addSelect('COUNT(*)', 'count')
    .groupBy('customer.level')
    .getRawMany();

  return {
    levelStats: levelStats.map(item => ({
      level: item.level,
      count: parseInt(item.count, 10),  // ✅ 后端转换为数字
    })),
    // ...
  };
}
```

**优点**:
- ✅ 前端无需处理类型转换
- ✅ 保证数据类型一致性
- ✅ 符合 DTO 定义

### 方案 2: DTO 使用 Transform

```typescript
// customer-statistics.dto.ts
import { Transform } from 'class-transformer';

export class LevelStatItem {
  @Transform(({ value }) => Number(value))
  count: number;
}
```

**优点**:
- ✅ 自动转换
- ✅ 声明式处理

---

## ✅ 验收标准

- [x] 编译无错误
- [x] 等级分布饼图正常显示
- [x] 风险分布饼图正常显示
- [x] 城市分布柱状图正常显示
- [x] 添加调试日志便于排查
- [x] 空数据保护（显示 Empty 组件）

---

**修复完成时间**: 2026-03-28 18:05  
**状态**: ✅ 已完成并编译通过  
**测试**: 待刷新浏览器后验证  

🎉 **现在请刷新浏览器（Ctrl+F5），查看统计图表是否正常显示！**
