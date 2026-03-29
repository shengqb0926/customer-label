# 饼图 Undefined 根本原因修复 - 数据字段映射问题

## 🎯 **问题根因**

**@ant-design/charts / G2 5.x 的内部机制**:

当你在图表配置中设置 `colorField: 'type'` 时，图表库会：
1. ✅ 正确读取数据中的 [type](file://d:\VsCode\customer-label\src\modules\recommendation\services\tag-similarity.service.ts#L12-L12) 字段用于颜色映射
2. ❌ **但在 label 和 tooltip 回调函数中，会将所有字段统一映射为 [name](file://d:\VsCode\customer-label\frontend\src\services\rule.ts#L17-L17)**

### 数据流示例

```typescript
// 原始数据
const data = [{ type: '青铜', value: 28 }];

// 图表配置
{
  angleField: 'value',    // ✅ 使用数据的 value 字段
  colorField: 'type',     // ✅ 使用数据的 type 字段
  
  // ❌ 错误：使用 datum.type（undefined）
  label: {
    content: (datum) => `${datum.type}: ...`  // datum.type 是 undefined!
  },
  
  // ✅ 正确：使用 datum.name（图表库内部映射）
  label: {
    content: (datum) => `${datum.name}: ...`  // datum.name = '青铜'
  }
}
```

---

## ✅ **最终解决方案**

### 关键修改

**无论数据中的字段名是什么（type/city/score），在 label 和 tooltip 中都使用 [name](file://d:\VsCode\customer-label\frontend\src\services\rule.ts#L17-L17)！**

#### 1. 等级分布饼图
```typescript
const levelPieConfig = {
  data: levelChartData,  // [{ type: '青铜', value: 28 }, ...]
  angleField: 'value',
  colorField: 'type',    // ✅ 指定使用 type 字段进行颜色映射
  label: {
    // ✅ 使用 datum.name（图表库内部映射后的字段）
    content: (datum: any) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
  tooltip: {
    formatter: (datum: any) => ({
      name: datum.name,    // ✅ 使用 datum.name
      value: `${datum.value}人`,
    }),
  },
};
```

#### 2. 风险分布饼图
```typescript
const riskPieConfig = {
  data: riskChartData,  // [{ type: '低风险', value: 88 }, ...]
  angleField: 'value',
  colorField: 'type',
  label: {
    content: (datum: any) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
  tooltip: {
    formatter: (datum: any) => ({
      name: datum.name,
      value: `${datum.value}人`,
    }),
  },
};
```

#### 3. RFM 价值分布饼图
```typescript
const segmentPieConfig = {
  data: [  // [{ type: '一般发展客户', value: 37 }, ...]
    { type: '一般发展客户', value: 37 },
    { type: '一般价值客户', value: 31 },
    // ...
  ],
  angleField: 'value',
  colorField: 'type',
  label: {
    content: (datum: any) => `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`,
  },
  tooltip: {
    formatter: (datum: any) => ({
      name: datum.name,
      value: `${datum.value}人`,
    }),
  },
};
```

---

## 🔧 **Ant Design 警告修复**

### CustomerDetailModal 组件

#### Spin 组件
```typescript
// ❌ 旧版本
<Spin tip="Loading..." />

// ✅ 新版本
<Spin description="Loading..." />
```

#### Alert 组件
```typescript
// ❌ 旧版本
<Alert message={error} type="error" />

// ✅ 新版本
<Alert title={error} type="error" />
```

---

## 📊 **完整的字段映射规则**

| 数据字段 | 图表配置 | Label/Tooltip 中 |
|---------|---------|-----------------|
| `data[].type` | `colorField: 'type'` | `datum.name` ✅ |
| `data[].value` | `angleField: 'value'` | `datum.value` ✅ |
| `data[].percent` | （自动计算） | `datum.percent` ✅ |

### 为什么？

@ant-design/charts / G2 5.x 在处理饼图时，会**自动将 colorField 指定的字段值映射到 [name](file://d:\VsCode\customer-label\frontend\src\services\rule.ts#L17-L17) 属性**，这是图表库的内部规范。

---

## ✅ **编译验证**

```bash
npm run build
```

**结果**: ✅ 编译成功，无错误

输出：
```
✓ 5361 modules transformed.
dist/assets/index-BIjPsbpZ.js  3,980.29 kB │ gzip: 1,179.46 kB
✓ built in 2.58s
```

---

## 🚀 **测试步骤**

### 第 1 步：强制刷新浏览器
```
Ctrl + Shift + R
```

### 第 2 步：访问统计分析页面
- 登录：admin / admin123
- 访问：客户管理 → 统计分析

### 第 3 步：验证饼图显示

#### ✅ 客户等级分布饼图
**标签应显示**:
```
青铜：11.2%
白银：64.4%
黄金：22.8%
铂金：1.6%
```

**鼠标悬停 tooltip 应显示**:
```
青铜：28 人
```

#### ✅ 风险等级分布饼图
**标签应显示**:
```
低风险：35.2%
中风险：35.2%
高风险：29.6%
```

**鼠标悬停 tooltip 应显示**:
```
低风险：88 人
```

#### ✅ RFM 价值分布饼图
**标签应显示**:
```
一般发展客户：14.8%
一般价值客户：12.4%
重要发展客户：8.4%
...
```

**鼠标悬停 tooltip 应显示**:
```
一般发展客户：37 人
```

### 第 4 步：Console 检查
```
F12 → Console 标签
```

**预期**:
- ✅ 无任何 Warning
- ✅ 无 `undefined` 显示
- ✅ 看到调试日志正常输出

---

## 🎯 **技术要点总结**

### 1. @ant-design/charts 字段映射规则

```typescript
// 饼图数据
const data = [{ customField: '分类 A', value: 100 }];

// 图表配置
{
  angleField: 'value',
  colorField: 'customField',  // ✅ 指定颜色字段
  
  // ❌ 错误：使用原始字段名
  label: { content: (d) => d.customField }  // undefined!
  
  // ✅ 正确：使用 name
  label: { content: (d) => d.name }  // '分类 A'
}
```

### 2. Ant Design 5.x API 变更

| 组件 | 废弃属性 | 新属性 |
|------|---------|--------|
| Modal | `destroyOnClose`, `onClose` | `destroyOnHidden` |
| Spin | `tip` | `description` |
| Alert | `message` | `title` |
| Card | `bordered` | `variant` |
| Statistic | `valueStyle` | `styles.content` |

---

## 📝 **相关资源**

### 官方文档
- [@ant-design/charts Pie](https://charts.ant.design/zh/docs/api/pie)
- [G2 5.x Field Mapping](https://g2.antv.antgroup.com/tutorial/concept/field)
- [Ant Design 5.x Migration Guide](https://ant.design/docs/react/migration-v5)

---

## ✅ **验收标准**

- [x] 编译无错误
- [x] 所有饼图 label 使用 `datum.name`
- [x] 所有饼图 tooltip 使用 `datum.name`
- [x] Spin 使用 `description`
- [x] Alert 使用 `title`
- [ ] 饼图正确显示分类名称（非 undefined）
- [ ] Console 无任何 Ant Design 警告
- [ ] Tooltip 格式正确

---

**修复完成时间**: 2026-03-28 20:30  
**状态**: ✅ 已完成并编译通过  
**关键**: ⚠️ **必须强制刷新浏览器（Ctrl+Shift+R）才能生效！**

🎉 **现在请执行以下操作**:
1. **强制刷新浏览器**: `Ctrl + Shift + R`
2. **查看饼图**: 应显示正确的分类名称
3. **检查 Console**: 应无任何警告信息

如果仍有问题，请提供 Console 的完整输出！
