# 饼图 Undefined 深度调试指南

## ✅ **已完成的操作**

1. ✅ 添加了 `sourcemap: true` 到 Vite 配置
2. ✅ 在饼图 label content 中添加了调试日志
3. ✅ 清理了 Vite 缓存
4. ✅ 重启了前端服务

**当前状态**: 前端服务运行在 http://localhost:5176/

---

## 🔍 **调试步骤**

### 第 1 步：访问页面并打开开发者工具

1. 访问：http://localhost:5176/
2. 登录：business_user / Business123
3. 导航到：客户管理 → 统计分析
4. 按 `F12` 打开开发者工具

---

### 第 2 步：查看 Console 调试日志

在 Console 中，你应该看到以下日志：

```javascript
=== 等级图表数据 === [{name: '青铜', value: 28}, ...]
=== 风险图表数据 === [{name: '低风险', value: 88}, ...]
=== RFM 数据 === {segmentDistribution: {...}}
Level datum: {name: '青铜', value: 28, percent: 0.112, ...}
Risk datum: {name: '低风险', value: 88, percent: 0.352, ...}
RFM datum: {name: '一般发展客户', value: 37, percent: 0.148, ...}
```

#### ✅ 正确情况
如果看到 `datum.name` 有正确的中文值（如 '青铜'、'低风险'），说明数据是正确的。

#### ❌ 问题情况
如果看到 `datum.name` 是 `undefined`，说明数据字段有问题。

---

### 第 3 步：检查饼图标签

#### 如果 Console 显示正确但饼图仍显示 undefined

这说明是 **@ant-design/charts 的 label 渲染问题**。

**解决方案**: 尝试移除 label 配置，只显示 tooltip。

---

## 🎯 **可能的原因分析**

### 原因 1: G2 5.x 的 label 字段映射问题

@ant-design/charts / G2 5.x 在处理饼图时，label 的 content 函数接收的 datum 对象**可能不包含原始数据字段**。

**验证方法**:
查看 Console 中 `Level datum` 等日志的输出。

**如果 datum 是空对象或只包含内部属性**:
- 说明 G2 没有将原始数据传递给 label
- 需要使用其他方式获取数据

**解决方案**: 使用 `tooltip` 而不是 `label`，或使用自定义 label 渲染。

---

### 原因 2: percent 计算问题

如果 `datum.percent` 是 undefined，会导致计算错误。

**验证方法**:
查看 Console 中 datum 对象的 `percent` 属性。

**解决方案**: G2 会自动计算 percent，但如果数据有问题，可能需要手动计算。

---

### 原因 3: 数据格式问题

如果数据不是数组，或数组元素不是对象，会导致渲染失败。

**验证方法**:
查看 Console 中 `=== 等级图表数据 ===` 等日志。

**解决方案**: 确保数据是 `[{name: string, value: number}, ...]` 格式。

---

## 🔧 **解决方案**

### 方案 1: 移除 label，只显示 tooltip（临时方案）

如果 label 一直显示 undefined，可以暂时移除 label 配置：

```typescript
const levelPieConfig = {
  appendPadding: 10,
  data: levelChartData,
  angleField: 'value',
  colorField: 'name',
  radius: 0.8,
  // label: { ... },  // 暂时注释掉
  interactions: [{ type: 'element-active' }],
  tooltip: {
    showMarkers: true,
    formatter: (datum: any) => ({
      name: datum.name,
      value: `${datum.value}人`,
    }),
  },
};
```

**效果**: 饼图上不显示标签，但鼠标悬停时会显示 tooltip。

---

### 方案 2: 使用 G2 5.x 的新 label API

G2 5.x 可能使用了新的 label 配置方式：

```typescript
label: {
  text: (datum: any) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
}
```

或者：

```typescript
label: {
  content: 'name',  // 直接使用字段名
}
```

---

### 方案 3: 手动计算 percent

如果 datum.percent 是 undefined，手动计算：

```typescript
const total = levelChartData.reduce((sum, item) => sum + item.value, 0);

const levelPieConfig = {
  data: levelChartData.map(item => ({
    ...item,
    percent: item.value / total,  // 手动计算
  })),
  angleField: 'value',
  colorField: 'name',
  label: {
    content: (datum: any) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
};
```

---

### 方案 4: 使用 G2 4.x 版本（降级）

如果 G2 5.x 有兼容性问题，可以降级到 G2 4.x：

```bash
npm uninstall @ant-design/plots
npm install @ant-design/plots@1.2.23  # G2 4.x 版本
```

---

## 📋 **验证清单**

完成调试后，请确认：

- [ ] Console 显示了图表数据日志
- [ ] Console 显示了 datum 对象日志
- [ ] datum.name 有正确的中文值
- [ ] datum.value 有正确的数值
- [ ] datum.percent 有正确的百分比值
- [ ] 饼图显示了标签（或 tooltip 正常工作）

---

## 🎯 **下一步行动**

### 如果 Console 中 datum.name 有值但饼图显示 undefined

**这是 @ant-design/charts 5.x 的 label 渲染 bug**。

**解决方案**: 
1. 暂时移除 label 配置，使用 tooltip
2. 或者降级到 @ant-design/plots 1.x 版本（使用 G2 4.x）

### 如果 Console 中 datum.name 也是 undefined

**这是数据映射问题**。

**解决方案**:
1. 检查数据准备代码
2. 确保使用 `name` 字段而不是 `type`
3. 确保 `colorField: 'name'`

---

## 📞 **请求帮助**

如果以上方案都无法解决问题，请提供以下信息：

1. **Console 完整输出**（截图）
   - 特别是 `Level datum`、`Risk datum`、`RFM datum` 的值

2. **饼图截图**
   - 显示 undefined 的饼图

3. **Network 中加载的文件列表**
   - 确认是否加载了最新的 JS 文件

4. **Sources 中能找到的文件**
   - 展开 `localhost:5176` 下的所有文件夹
   - 截图显示目录结构

---

**创建时间**: 2026-03-28 21:30  
**状态**: ⚠️ **需要查看 Console 输出才能确定问题**

🎉 **现在请执行以下操作**:
1. **访问**: http://localhost:5176/
2. **打开 Console**: F12 → Console 标签
3. **查看输出**: 找到 `Level datum`、`Risk datum`、`RFM datum` 日志
4. **告诉我**: datum 对象的实际值是什么？

根据 Console 输出，我可以确定问题的真正原因并提供精确的解决方案！🔍
