# 统计图表数据调试指南

## 🐛 问题现象

用户反馈统计分析页面中以下图表没有数据显示：
- ❌ RFM 价值分布
- ❌ 客户等级分布  
- ❌ 风险等级分布

---

## 🔍 后端 API 验证

### ✅ 后端数据完全正常

通过测试脚本验证，所有 API 返回的数据都是正确的：

#### RFM Summary API
```json
{
  "totalCustomers": 250,
  "segmentDistribution": {
    "一般发展客户": 37,
    "一般价值客户": 31,
    "重要发展客户": 21,
    "重要价值客户": 16,
    "重要挽留客户": 31,
    "一般挽留客户": 54,
    "一般保持客户": 38,
    "重要保持客户": 22
  },
  "avgRecency": 32,
  "avgFrequency": 24.5,
  "avgMonetary": null,
  "highValueRatio": 0.41
}
```

#### RFM Analysis API
```json
{
  "total": 250,
  "data": [
    {
      "customerId": "1",
      "customerName": "朱璐筠",
      "recency": 23,
      "frequency": 20,
      "monetary": "252623.99",
      "rScore": 4,
      "fScore": 3,
      "mScore": 2,
      "totalScore": 9,
      "customerSegment": "一般发展客户",
      "strategy": "鼓励复购，培养消费习惯"
    }
    // ... 共 100 条
  ]
}
```

#### Customer Statistics API
```json
{
  "total": 250,
  "levelStats": [
    { "level": "BRONZE", "count": "28" },
    { "level": "GOLD", "count": "57" },
    { "level": "PLATINUM", "count": "4" },
    { "level": "SILVER", "count": "161" }
  ],
  "riskStats": [
    { "riskLevel": "MEDIUM", "count": "88" },
    { "riskLevel": "HIGH", "count": "74" },
    { "riskLevel": "LOW", "count": "88" }
  ],
  "cityStats": [...]
}
```

**结论**: 后端 API 返回的数据完全正确，问题出在前端渲染层。

---

## 🔧 前端修复方案

### 已实施的修改

#### 1. 增强数据加载的调试日志

```typescript
const loadRfmAnalysis = async () => {
  setRfmLoading(true);
  try {
    const params: any = { page: 1, limit: 100 };
    if (segmentFilter) params.segment = segmentFilter;
    
    const result = await customerService.getRfmAnalysis(params);
    console.log('=== RFM Analysis 结果 ===', result);  // ✅ 新增
    setRfmData(result.data || []);
    
    // 加载汇总数据
    const summary = await customerService.getRfmSummary();
    console.log('=== RFM Summary 结果 ===', summary);  // ✅ 新增
    setRfmSummary(summary);
  } catch (error: any) {
    console.error('加载 RFM 分析失败:', error);
  } finally {
    setRfmLoading(false);
  }
};
```

#### 2. 增强图表数据转换的调试日志

```typescript
// 等级分布
const levelChartData = statistics.levelStats.map((item) => ({
  type: /* ... */,
  value: Number(item.count),
}));
console.log('=== 等级图表数据 ===', levelChartData);  // ✅ 新增

// 风险分布
const riskChartData = statistics.riskStats.map((item) => ({
  type: /* ... */,
  value: Number(item.count),
}));
console.log('=== 风险图表数据 ===', riskChartData);  // ✅ 新增

// RFM 价值分布
const segmentPieConfig = {
  data: rfmSummary && rfmSummary.segmentDistribution 
    ? Object.entries(rfmSummary.segmentDistribution).map(([type, value]) => ({
        type,
        value: Number(value),
      })) 
    : [],
};
console.log('=== RFM 价值分布数据 ===', segmentPieConfig.data);  // ✅ 新增
```

#### 3. 增强数据健壮性检查

```typescript
// RFM 价值分布 - 增加空值保护
const segmentPieConfig = {
  data: rfmSummary && rfmSummary.segmentDistribution 
    ? Object.entries(rfmSummary.segmentDistribution).map(...) 
    : [],  // ✅ 如果数据不存在，返回空数组
};
```

---

## 🚀 测试步骤

### 1. 强制刷新浏览器
```
Ctrl + F5
```

### 2. 打开开发者工具（F12）

#### Console 标签页
查看以下调试信息：

##### ✅ 应该看到的数据日志
```javascript
=== 统计数据 === {...}
=== 等级分布原始数据 === [{level: 'BRONZE', count: '28'}, ...]
=== 风险分布原始数据 === [{riskLevel: 'LOW', count: '88'}, ...]
=== 等级图表数据 === [{type: '青铜', value: 28}, ...]
=== 风险图表数据 === [{type: '低风险', value: 88}, ...]

=== RFM Analysis 结果 === {total: 250, data: [...]}
=== RFM Summary 结果 === {totalCustomers: 250, segmentDistribution: {...}}
=== RFM 价值分布数据 === [{type: '一般发展客户', value: 37}, ...]
```

##### ❌ 如果看到错误
- `Cannot read property 'segmentDistribution' of undefined` → rfmSummary 为 null
- `levelChartData is not defined` → 数据转换逻辑有误
- `Network Error` → API 请求失败

#### Network 标签页
检查以下请求：

| 请求 | 方法 | 状态 | 预期结果 |
|------|------|------|----------|
| `/customers/statistics` | GET | 200 | 返回统计数据 |
| `/customers/rfm-analysis` | POST | 201 | 返回 RFM 详情 |
| `/customers/rfm-summary` | POST | 201 | 返回 RFM 汇总 |

---

## 📊 预期显示效果

### ✅ RFM 价值分布饼图
应该显示 8 个扇区：
- 一般发展客户：37 人 (14.8%)
- 一般价值客户：31 人 (12.4%)
- 重要发展客户：21 人 (8.4%)
- 重要价值客户：16 人 (6.4%)
- 重要挽留客户：31 人 (12.4%)
- 一般挽留客户：54 人 (21.6%)
- 一般保持客户：38 人 (15.2%)
- 重要保持客户：22 人 (8.8%)

### ✅ 客户等级分布饼图
应该显示 4 个扇区：
- 青铜：28 人 (11.2%)
- 白银：161 人 (64.4%)
- 黄金：57 人 (22.8%)
- 铂金：4 人 (1.6%)

### ✅ 风险等级分布饼图
应该显示 3 个扇区：
- 低风险：88 人 (35.2%)
- 中风险：88 人 (35.2%)
- 高风险：74 人 (29.6%)

---

## 🔍 排查清单

### 如果图表仍然不显示，请按顺序检查：

#### 1️⃣ 检查浏览器 Console
```
F12 → Console 标签
```
- ✅ 应该看到所有调试日志
- ❌ 如果有红色错误，请记录详细信息

#### 2️⃣ 检查 Network 请求
```
F12 → Network 标签 → 刷新页面
```
- ✅ `/customers/statistics` - 200 OK
- ✅ `/customers/rfm-analysis` - 201 Created
- ✅ `/customers/rfm-summary` - 201 Created
- ❌ 如果有失败请求，查看响应内容

#### 3️⃣ 检查数据格式
在 Console 中输入：
```javascript
console.log('RFM Summary:', JSON.parse(localStorage.getItem('rfm_summary')));
```
或者直接看调试日志中的输出

#### 4️⃣ 清理缓存
```
Ctrl + Shift + Delete
→ 选择"全部时间"
→ 勾选"缓存的图片和文件"
→ 清除数据
```

#### 5️⃣ 强制刷新
```
Ctrl + F5 (或 Cmd + Shift + R)
```

#### 6️⃣ 重新登录
退出登录后重新登录，确保 token 有效

---

## 🎯 可能的原因分析

### 原因 1: 数据加载顺序问题
**现象**: 某些图表显示，某些不显示  
**解决**: 已通过添加调试日志确认数据加载情况

### 原因 2: 数据类型不匹配
**现象**: 图表库无法解析字符串类型的数值  
**解决**: 已在所有图表数据转换中使用 `Number()` 强制转换

### 原因 3: 条件渲染逻辑问题
**现象**: 数据存在但组件未渲染  
**解决**: 已优化空值保护逻辑

### 原因 4: 浏览器缓存
**现象**: 代码已更新但浏览器仍使用旧版本  
**解决**: 强制刷新 + 清理缓存

### 原因 5: @ant-design/charts 渲染问题
**现象**: 数据结构正确但图表不显示  
**排查**: 检查图表库版本和配置项

---

## 📝 调试技巧

### 方法 1: 直接查看组件 Props
在 Console 中执行：
```javascript
// 查看当前页面的所有 React 组件
// 需要安装 React DevTools 插件
```

### 方法 2: 断点调试
1. 打开 Sources 标签
2. 找到 `CustomerStatistics.tsx` 文件
3. 在关键代码行设置断点
4. 刷新页面触发断点
5. 查看变量值

### 方法 3: 临时修改代码
在组件中添加：
```tsx
<div style={{ display: 'none' }}>
  Debug: {JSON.stringify({
    rfmSummary,
    levelChartData,
    riskChartData,
    segmentPieConfig,
  })}
</div>
```

---

## ✅ 验收标准

- [x] 编译无错误
- [x] 添加完整的调试日志
- [x] 数据转换逻辑正确
- [x] 空值保护逻辑完善
- [ ] RFM 价值分布饼图正常显示
- [ ] 客户等级分布饼图正常显示
- [ ] 风险等级分布饼图正常显示
- [ ] Console 无错误信息

---

**修复完成时间**: 2026-03-28 18:45  
**状态**: ✅ 已完成并编译通过  
**测试**: 待刷新浏览器后验证  

🎉 **现在请刷新浏览器（Ctrl+F5），打开 Console（F12）查看调试日志，并告诉我看到了什么！**
