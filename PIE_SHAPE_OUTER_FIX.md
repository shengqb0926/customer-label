# 饼图 shape.outer 错误修复 - 最终版本

## 🐛 **问题现象**

```
Uncaught (in promise) Error: Unknown Component: shape.outer
```

**原因**: @ant-design/charts / G2 5.x 的饼图 label 配置**不支持 `type: 'outer'` 属性**。

---

## 🔍 **问题根因**

在 RFM 价值分布饼图配置中，label 对象包含了已废弃的 `type: 'outer'` 属性：

```typescript
// ❌ 错误配置
label: {
  type: 'outer',  // ❌ 不支持！会导致 "Unknown Component: shape.outer" 错误
  content: (datum) => ...
}
```

**注意**: 其他两个饼图（等级分布、风险分布）的配置是正确的，只有 RFM 饼图有这个错误。

---

## ✅ **解决方案**

### 移除 `type: 'outer'` 属性

```typescript
// ✅ 正确配置
label: {
  content: (datum: any) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
}
```

**关键点**:
- ✅ 移除 `type: 'outer'`
- ✅ 只保留 `content` 属性
- ✅ 数据使用 `name` 字段（不是 `type`）
- ✅ `colorField: 'name'`

---

## 📊 **完整的修复对比**

### 修改前（错误）
```typescript
const segmentPieConfig = {
  data: [...],
  angleField: 'value',
  colorField: 'name',
  label: {
    type: 'outer',  // ❌ 错误！
    content: (datum) => `${datum.name}: ...`,
  },
};
```

### 修改后（正确）
```typescript
const segmentPieConfig = {
  data: [...],
  angleField: 'value',
  colorField: 'name',
  label: {
    // ✅ 移除 type: 'outer'
    content: (datum) => `${datum.name}: ...`,
  },
};
```

---

## 🎯 **三个饼图的统一配置**

现在所有三个饼图都使用相同的配置模式：

### 1. 等级分布饼图
```typescript
{
  data: levelChartData,  // [{ name: '青铜', value: 28 }, ...]
  angleField: 'value',
  colorField: 'name',
  label: {
    content: (datum) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
}
```

### 2. 风险分布饼图
```typescript
{
  data: riskChartData,  // [{ name: '低风险', value: 88 }, ...]
  angleField: 'value',
  colorField: 'name',
  label: {
    content: (datum) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
}
```

### 3. RFM 价值分布饼图
```typescript
{
  data: segmentData,  // [{ name: '一般发展客户', value: 37 }, ...]
  angleField: 'value',
  colorField: 'name',
  label: {
    content: (datum) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
}
```

---

## ✅ **编译验证**

```bash
npm run build
```

**结果**: ✅ 编译成功，无错误

输出：
```
✓ 5361 modules transformed.
dist/assets/index-BSPITIjb.js  3,980.37 kB │ gzip: 1,179.49 kB
✓ built in 2.43s
```

---

## 🚀 **测试步骤**

### 第 1 步：强制刷新浏览器
```
Ctrl + Shift + R
```

### 第 2 步：访问统计分析页面
- 登录：business_user / Business123
- 访问：客户管理 → 统计分析

### 第 3 步：验证所有饼图

#### ✅ 客户等级分布饼图
**应显示标签**:
```
青铜：11.2%
白银：64.4%
黄金：22.8%
铂金：1.6%
```

#### ✅ 风险等级分布饼图
**应显示标签**:
```
低风险：35.2%
中风险：35.2%
高风险：29.6%
```

#### ✅ RFM 价值分布饼图（已修复）
**应显示标签**:
```
一般发展客户：14.8%
一般价值客户：12.4%
重要发展客户：8.4%
重要价值客户：6.0%
重要挽留客户：5.6%
一般挽留客户：16.4%
一般保持客户：12.4%
重要保持客户：24.0%
```

### 第 4 步：Console 检查
```
F12 → Console 标签
```

**预期**:
- ✅ 无 `Unknown Component: shape.outer` 错误
- ✅ 无任何 Warning
- ✅ 所有饼图正常渲染

---

## 📝 **技术要点总结**

### @ant-design/charts 5.x 饼图 Label 配置

#### ✅ 支持的属性
```typescript
label: {
  content: (datum) => string,  // 标签内容函数
  position?: 'inner' | 'outer', // 位置（可选）
  style?: object,               // 样式对象（可选）
}
```

#### ❌ 不支持的属性
```typescript
label: {
  type: 'outer',  // ❌ 已废弃！不要使用
}
```

### 数据字段规范

| 字段 | 类型 | 用途 | 必需 |
|------|------|------|------|
| `name` | string | 分类名称、Tooltip 显示 | ✅ |
| `value` | number | 数值、扇区大小 | ✅ |
| `percent` | number | 百分比（自动计算） | 自动 |

---

## 🔧 **为什么之前显示 undefined？**

### 原因链条
1. **数据使用 `type` 字段**: `{ type: '青铜', value: 28 }`
2. **Label 使用 `datum.type`**: 图表库无法识别 `type` 字段
3. **结果**: `datum.type` → `undefined`

### 解决方案
✅ **数据直接使用 `name` 字段**: `{ name: '青铜', value: 28 }`  
✅ **Label 使用 `datum.name`**: 直接访问数据字段  
✅ **`colorField: 'name'`**: 明确指定颜色映射字段

---

## ✅ **验收标准**

- [x] 编译无错误
- [x] 所有饼图 label 移除 `type: 'outer'`
- [x] 所有数据使用 `name` 字段
- [x] 所有配置 `colorField: 'name'`
- [ ] Console 无 `Unknown Component: shape.outer` 错误
- [ ] 所有饼图正确显示分类标签
- [ ] Tooltip 格式正确

---

## 📄 **相关资源**

- [@ant-design/charts Pie API](https://charts.ant.design/zh/docs/api/pie)
- [G2 5.x Label 配置](https://g2.antv.antgroup.com/api/core/label)

---

**修复完成时间**: 2026-03-28 20:55  
**状态**: ✅ 已完成并编译通过  
**关键修复**: ⭐ **移除 RFM 饼图的 `type: 'outer'` 配置**

🎉 **现在请执行以下操作**:
1. **强制刷新浏览器**: `Ctrl + Shift + R`
2. **查看 RFM 价值分布饼图**: 应显示所有 8 个分类的标签
3. **检查 Console**: 应无 `shape.outer` 错误

如果还有问题，请截图 Console 输出！
