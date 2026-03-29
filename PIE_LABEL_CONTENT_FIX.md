# 饼图 Label Content 语法修复 - ExpressionError

## 🐛 问题现象

**错误信息**:
```
Uncaught (in promise) ExpressionError: Unexpected character: }
    at parseOptionsExpr (@ant-design_charts.js)
```

**影响范围**:
- ❌ 客户等级分布饼图
- ❌ 风险等级分布饼图
- ❌ RFM 价值分布饼图

---

## 🔍 问题诊断

### Console 日志显示

从用户提供的 Console 日志可以看到，所有饼图都在渲染时报错：

```javascript
=== 等级图表数据 === (4) [{…}, {…}, {…}, {…}]
=== 风险图表数据 === (3) [{…}, {…}, {…}]
=== RFM 价值分布数据 === (8) [{…}, {…}, {…}, …]
```

**结论**: 
- ✅ 数据加载完全正确
- ✅ 数据类型转换正确
- ❌ 图表库解析 label content 时抛出异常

---

## 🎯 根本原因

**@ant-design/charts API 变更**:

在 G2 5.x / @ant-design/charts 新版本中，label 的 `content` 配置不再支持**模板字符串格式**。

### 原配置（错误）
```typescript
// ❌ 错误的模板字符串语法
label: {
  type: 'outer',
  content: '{name} {percentage}',  // ❌ 不支持！
}
```

### 导致的问题
- 图表库无法解析 `{name} {percentage}` 模板字符串
- 抛出 `ExpressionError: Unexpected character: }` 错误
- 所有使用此配置的饼图都无法渲染

---

## ✅ 解决方案

### 修改配置

将模板字符串改为**函数形式**，显式返回格式化文本。

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
    type: 'outer',
    content: (datum: { name: string; percent: number }) => 
      `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
  interactions: [{ type: 'element-active' }],
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
    type: 'outer',
    content: (datum: { name: string; percent: number }) => 
      `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
  interactions: [{ type: 'element-active' }],
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
    type: 'outer',
    content: (datum: { name: string; percent: number }) => 
      `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
  interactions: [{ type: 'element-active' }],
};
```

---

## 📊 API 对比

### 旧版本（G2 4.x）
```typescript
// ✅ 可能支持模板字符串
label: {
  content: '{name} {percentage}'
}
```

### 新版本（G2 5.x / @ant-design/charts）
```typescript
// ✅ 必须使用函数形式
label: {
  content: (datum) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`
}
```

---

## 🎯 技术要点

### 1. TypeScript 类型声明

```typescript
// ✅ 显式声明参数类型
content: (datum: { name: string; percent: number }) => string

// ❌ 隐式 any 类型会报错
content: ({ name, percent }) => ...  // TS7031 error
```

### 2. 百分比计算

```typescript
// datum.percent 是 0-1 之间的小数
// 需要乘以 100 并保留 1 位小数
(datum.percent * 100).toFixed(1)  // 例如：0.352 → "35.2"
```

### 3. 可用的 Label 属性

在 label content 函数中，可以访问以下属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | string | 数据项名称 |
| `percent` | number | 占比（0-1 之间） |
| `value` | number | 原始数值 |
| `color` | string | 颜色值 |

---

## ✅ 编译验证

```bash
npm run build
```

**结果**: ✅ 编译成功，无错误

输出：
```
✓ 5361 modules transformed.
dist/index.html                    0.61 kB │ gzip:   0.34 kB
dist/assets/worker-ChiceUKA.js     291.26 kB
dist/assets/index-DotxbmHx.css       1.50 kB │ gzip:   0.70 kB
dist/assets/react-dom-B8wYtxVk.js   12.02 kB │ gzip:   4.35 kB
dist/assets/client-DNIT4O5J.js     178.87 kB │ gzip:  56.47 kB
dist/assets/index-l5NUqUTc.js    3,980.21 kB │ gzip: 1,179.52 kB
✓ built in 2.90s
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
- 标签显示在外部

#### ✅ 风险等级分布饼图
- 显示 3 个扇区：低风险、中风险、高风险
- **标签格式**: `低风险：35.2%`
- 标签显示在外部

#### ✅ RFM 价值分布饼图
- 显示 8 个扇区：8 种客户分类
- **标签格式**: `一般发展客户：14.8%`
- 标签显示在外部

### 4. Console 检查
```
F12 → Console 标签
```

**预期**: 
- ✅ 无任何错误信息
- ✅ 无 `ExpressionError` 错误
- ✅ 看到调试日志正常输出

---

## 📝 相关资源

### 官方文档
- [@ant-design/charts](https://charts.ant.design/)
- [G2 5.x Label Configuration](https://g2.antv.antgroup.com/api/options/label#content)

### 常见问题
- [Label Content Function](https://g2.antv.antgroup.com/manual/concepts/label#formatting)
- [G2 Migration Guide](https://g2.antv.antgroup.com/manual/migration)

---

## ✅ 验收标准

- [x] 编译无错误
- [x] 所有饼图 label content 改为函数形式
- [x] 添加 TypeScript 类型声明
- [ ] 客户等级分布饼图正常显示
- [ ] 风险等级分布饼图正常显示
- [ ] RFM 价值分布饼图正常显示
- [ ] Console 无 ExpressionError 错误
- [ ] 标签格式正确（名称：百分比%）

---

**修复完成时间**: 2026-03-28 19:15  
**状态**: ✅ 已完成并编译通过  
**测试**: 待刷新浏览器后验证  

🎉 **现在请刷新浏览器（Ctrl+F5），查看所有饼图是否正常显示！**
