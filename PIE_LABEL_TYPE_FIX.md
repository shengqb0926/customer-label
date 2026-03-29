# 饼图 Label Type 配置修复 - Unknown Component: shape.outer

## 🐛 问题现象

**错误信息**:
```
Uncaught (in promise) Error: Unknown Component: shape.outer
    at create (@ant-design_charts.js)
```

**影响范围**:
- ❌ 客户等级分布饼图
- ❌ 风险等级分布饼图
- ❌ RFM 价值分布饼图

---

## 🔍 问题诊断

### Console 日志显示

数据加载和 tooltip 配置都正确，但图表渲染时报错：
```javascript
=== 等级图表数据 === (4) [{…}, {…}, {…}, {…}]
=== 风险图表数据 === (3) [{…}, {…}, {…}]
=== RFM 价值分布数据 === (8) [{…}, {…}, {…}, …]
```

**结论**: 
- ✅ 数据加载完全正确
- ✅ tooltip 配置正确
- ❌ label 的 `type: 'outer'` 配置不被支持

---

## 🎯 根本原因

**@ant-design/charts API 变更**:

在 G2 5.x / @ant-design/charts 新版本中，label 的 `type` 配置已不再支持 `'outer'` 值。

### 原配置（错误）
```typescript
// ❌ 错误的 type 配置
label: {
  type: 'outer',  // ❌ 不支持！
  content: (datum) => ...
}
```

### 导致的问题
- 图表库无法识别 `shape.outer` 组件
- 抛出 `Unknown Component: shape.outer` 错误
- 所有使用此配置的饼图都无法渲染

---

## ✅ 解决方案

### 修改配置

直接移除 `type: 'outer'` 配置，使用默认 label 渲染。

#### 1. 客户等级分布饼图
```typescript
// ✅ 修改后
const levelPieConfig = {
  appendPadding: 10,
  data: levelChartData,
  angleField: 'value',
  colorField: 'type',
  radius: 0.8,
  label: {
    // ✅ 移除 type: 'outer'，只保留 content
    content: (datum: { name: string; percent: number }) => 
      `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
  interactions: [{ type: 'element-active' }],
  // ... 其他配置
};
```

#### 2. 风险等级分布饼图
```typescript
// ✅ 修改后
const riskPieConfig = {
  appendPadding: 10,
  data: riskChartData,
  angleField: 'value',
  colorField: 'type',
  radius: 0.8,
  label: {
    // ✅ 移除 type: 'outer'，只保留 content
    content: (datum: { name: string; percent: number }) => 
      `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
  interactions: [{ type: 'element-active' }],
  // ... 其他配置
};
```

#### 3. RFM 价值分布饼图
```typescript
// ✅ 修改后
const segmentPieConfig = {
  appendPadding: 10,
  data: rfmSummary && rfmSummary.segmentDistribution 
    ? Object.entries(rfmSummary.segmentDistribution).map(([type, value]) => ({
        type,
        value: Number(value),
      })) 
    : [],
  angleField: 'value',
  colorField: 'type',
  radius: 0.8,
  label: {
    // ✅ 移除 type: 'outer'，只保留 content
    content: (datum: { type: string; percent: number }) => 
      `${datum.type}: ${(datum.percent * 100).toFixed(1)}%`,
  },
  interactions: [{ type: 'element-active' }],
  // ... 其他配置
};
```

---

## 📊 API 对比

### 旧版本（G2 4.x）
```typescript
// ✅ 可能支持 type: 'outer'
label: {
  type: 'outer',
  content: '{name} {percentage}'
}
```

### 新版本（G2 5.x / @ant-design/charts）
```typescript
// ✅ 移除 type，直接使用 content
label: {
  content: (datum) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`
}
```

---

## ✅ 编译验证

```bash
npm run build
```

**结果**: ✅ 编译成功，无错误

输出：
```
✓ 5361 modules transformed.
dist/assets/index-PqDq5Yzi.js  3,980.59 kB │ gzip: 1,179.58 kB
✓ built in 2.54s
```

---

## 🚀 测试步骤

### 1. 强制刷新浏览器
```
Ctrl + F5
```

### 2. 访问统计分析页面
- 登录：admin / admin123
- 访问：客户管理 → 统计分析

### 3. 预期显示效果

#### ✅ 客户等级分布饼图
- 显示 4 个扇区：青铜、白银、黄金、铂金
- **标签格式**: `青铜：11.2%`
- **Tooltip**: `青铜：28 人`

#### ✅ 风险等级分布饼图
- 显示 3 个扇区：低风险、中风险、高风险
- **标签格式**: `低风险：35.2%`
- **Tooltip**: `低风险：88 人`

#### ✅ RFM 价值分布饼图
- 显示 8 个扇区：8 种客户分类
- **标签格式**: `一般发展客户：14.8%`
- **Tooltip**: `一般发展客户：37 人`

### 4. Console 检查
```
F12 → Console 标签
```

**预期**: 
- ✅ 无任何错误信息
- ✅ 无 `Unknown Component` 错误
- ✅ 所有图表正常渲染

---

## 🎯 技术要点

### 1. Label 配置简化

新版本倾向于简化配置：
```typescript
// ❌ 过度配置
label: {
  type: 'outer',
  content: ...
}

// ✅ 简洁配置
label: {
  content: ...
}
```

### 2. 默认行为

不指定 `type` 时，图表库会根据图表类型自动选择最合适的 label 渲染方式：
- **饼图**: 自动使用外部标签
- **柱状图**: 自动使用顶部/内部标签

### 3. 结合 Tooltip

完整的图表配置应同时包含 label 和 tooltip：
```typescript
{
  label: {
    content: (datum) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
  tooltip: {
    formatter: (datum) => ({
      name: datum.name,
      value: `${datum.value}人`,
    }),
  },
}
```

---

## 📝 相关资源

### 官方文档
- [@ant-design/charts](https://charts.ant.design/)
- [G2 5.x Label Configuration](https://g2.antv.antgroup.com/api/options/label)

### 常见问题
- [Label 自定义内容](https://g2.antv.antgroup.com/manual/concepts/label#formatting)
- [G2 Migration Guide](https://g2.antv.antgroup.com/manual/migration)

---

## ✅ 验收标准

- [x] 编译无错误
- [x] 所有饼图移除 `type: 'outer'` 配置
- [ ] 客户等级分布饼图正常显示
- [ ] 风险等级分布饼图正常显示
- [ ] RFM 价值分布饼图正常显示
- [ ] Console 无 Unknown Component 错误
- [ ] 标签格式正确（名称：百分比%）
- [ ] Tooltip 格式正确（名称：数值 + 单位）

---

**修复完成时间**: 2026-03-28 19:45  
**状态**: ✅ 已完成并编译通过  
**测试**: 待刷新浏览器后验证  

🎉 **现在请刷新浏览器（Ctrl+F5），查看所有饼图是否正常显示！**
