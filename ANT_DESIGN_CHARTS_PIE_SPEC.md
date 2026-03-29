# @ant-design/charts 5.x 饼图 Label 配置规范

## 📚 **概述**

本文档总结了在使用 @ant-design/charts 5.x（基于 G2 5.x）开发饼图时的关键经验和最佳实践。

---

## 🎯 **核心问题**

### 问题现象
饼图标签显示 `undefined: XX%` 而不是正确的分类名称。

### 根本原因
@ant-design/charts 5.x / G2 5.x 对数据字段有严格要求：
1. **数据字段名**: 必须使用 `name` 和 `value`，而不是 `type` 或其他自定义字段名
2. **隐式映射陷阱**: 即使配置了 `colorField: 'type'`，在 label 和 tooltip 回调中也不会自动映射到 `name`
3. **浏览器缓存**: Vite 的强缓存策略会导致代码更新后浏览器仍加载旧版本

---

## ✅ **正确实践**

### 1. 数据准备规范

#### ✅ 正确示例
```typescript
// 等级分布数据
const levelChartData = statistics.levelStats.map((item) => ({
  name: item.level === 'BRONZE' ? '青铜' : '白银',  // ✅ 使用 name 字段
  value: Number(item.count),
}));

// 风险分布数据
const riskChartData = statistics.riskStats.map((item) => ({
  name: item.riskLevel === 'LOW' ? '低风险' : '高风险',  // ✅ 使用 name 字段
  value: Number(item.count),
}));

// RFM 价值分布数据
const segmentData = Object.entries(rfmSummary.segmentDistribution).map(([key, value]) => ({
  name: key,  // ✅ 直接使用 name 字段
  value: Number(value),
}));
```

#### ❌ 错误示例
```typescript
// ❌ 使用 type 字段
const data = statistics.map((item) => ({
  type: item.level,  // ❌ 图表库无法识别
  value: Number(item.count),
}));

// ❌ 在 label 中使用 datum.type
label: {
  content: (datum) => `${datum.type}: ...`  // ❌ undefined!
}
```

---

### 2. 图表配置规范

#### ✅ 完整配置模板
```typescript
const pieConfig = {
  data: chartData,  // [{ name: '分类', value: 100 }, ...]
  angleField: 'value',
  colorField: 'name',  // ✅ 必须与数据字段名一致
  radius: 0.8,
  label: {
    content: (datum: any) => {
      // ✅ datum.name 可直接访问
      return `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`;
    },
  },
  interactions: [{ type: 'element-active' }],
  tooltip: {
    formatter: (datum: any) => ({
      name: datum.name,
      value: `${datum.value}人`,
    }),
  },
};
```

#### 关键字段说明
| 字段 | 类型 | 用途 | 必需 |
|------|------|------|------|
| `data[].name` | string | 分类名称、Tooltip 显示 | ✅ |
| `data[].value` | number | 数值、扇区大小 | ✅ |
| `colorField` | string | 颜色映射字段 | ✅ 必须为 `'name'` |
| `angleField` | string | 角度映射字段 | ✅ 必须为 `'value'` |
| `datum.percent` | number | 百分比（G2 自动计算） | 自动 |

---

### 3. 调试技巧

#### 添加调试日志
```typescript
// 数据准备后添加日志
console.log('=== 图表数据 ===', chartData);

// label content 中添加日志
label: {
  content: (datum: any) => {
    console.log('Datum:', datum);  // ✅ 查看 datum 的实际字段
    return `${datum.name}: ${(datum.percent * 100).toFixed(1)}%`;
  },
}
```

#### 预期输出
```javascript
=== 图表数据 === [
  { name: '青铜', value: 28 },
  { name: '白银', value: 161 },
  ...
]

Datum: {
  name: '青铜',
  value: 28,
  percent: 0.112,
  // ... 其他 G2 内部属性
}
```

---

## 🔧 **常见问题与解决方案**

### 问题 1: 显示 `undefined: XX%`

**原因**: 数据使用了错误的字段名（如 `type` 而不是 `name`）

**解决方案**:
```typescript
// ❌ 修改前
const data = items.map(item => ({
  type: item.level,
  value: item.count,
}));

// ✅ 修改后
const data = items.map(item => ({
  name: item.level,  // ✅ 必须使用 name
  value: item.count,
}));
```

---

### 问题 2: `Unknown Component: shape.outer`

**原因**: label 配置中使用了已废弃的 `type: 'outer'` 属性

**解决方案**:
```typescript
// ❌ 错误配置
label: {
  type: 'outer',  // ❌ 不支持！
  content: (datum) => ...
}

// ✅ 正确配置
label: {
  content: (datum) => ...  // 只保留 content
}
```

---

### 问题 3: 代码已更新但浏览器仍显示旧效果

**原因**: Vite 开发服务器的强缓存策略

**解决方案**:

#### 方法 1: 强制刷新
```
Ctrl + Shift + R
或
Ctrl + F5
```

#### 方法 2: 清理 Vite 缓存
```bash
# Git Bash
cd frontend
rm -rf node_modules/.vite
npm run dev
```

#### 方法 3: 完全清理浏览器缓存
1. `Ctrl + Shift + Delete`
2. 时间范围：全部时间
3. 勾选：缓存的图片和文件
4. 清除数据
5. 关闭浏览器
6. 重新打开并访问

#### 方法 4: 开发时禁用缓存
1. F12 打开开发者工具
2. Network 标签
3. 勾选 "Disable cache"
4. 保持开发者工具打开

---

### 问题 4: Ant Design 5.x 警告

#### Modal 组件
```typescript
// ❌ 旧版本
<Modal destroyOnClose={true} onClose={handleClose} />

// ✅ 新版本
<Modal destroyOnHidden={true} onCancel={handleClose} />
```

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
<Alert message="错误信息" type="error" />

// ✅ 新版本
<Alert title="错误信息" type="error" />
```

#### Card 组件
```typescript
// ❌ 旧版本
<Card bordered={false} />

// ✅ 新版本
<Card variant="outlined" />
```

#### Statistic 组件
```typescript
// ❌ 旧版本
<Statistic valueStyle={{ color: 'red' }} />

// ✅ 新版本
<Statistic styles={{ content: { color: 'red' } }} />
```

---

## 📋 **开发检查清单**

### 数据准备阶段
- [ ] 数据对象使用 `name` 字段（不是 `type`, `category` 等）
- [ ] 数据对象使用 `value` 字段（不是 `count`, `amount` 等）
- [ ] 数值字段已转换为数字：`Number(item.count)`
- [ ] 添加了调试日志：`console.log('=== 图表数据 ===', data)`

### 图表配置阶段
- [ ] `colorField: 'name'`（与数据字段一致）
- [ ] `angleField: 'value'`
- [ ] label content 使用 `datum.name`
- [ ] tooltip formatter 使用 `datum.name`
- [ ] 移除了 `type: 'outer'` 等废弃属性
- [ ] 添加了调试日志到 label content

### 编译与部署
- [ ] 运行 `npm run build` 确认无编译错误
- [ ] 清理了 Vite 缓存：`rm -rf node_modules/.vite`
- [ ] 重启了开发服务器
- [ ] 确认端口正确：前端 5176，后端 3000

### 浏览器测试
- [ ] 完全关闭了浏览器
- [ ] 清理了浏览器缓存（Ctrl+Shift+Delete）
- [ ] 使用强制刷新（Ctrl+Shift+R）
- [ ] Console 显示正确的数据格式
- [ ] Sources 能搜索到最新代码
- [ ] 饼图显示正确的标签（非 undefined）
- [ ] Console 无任何警告

---

## 🎯 **最佳实践总结**

### 1. 字段命名规范
**永远使用标准字段名**:
- ✅ `name` + `value`
- ❌ `type`, `category`, `label`, `count`, `amount`

### 2. 数据转换规范
**在数据准备阶段完成所有转换**:
```typescript
const data = statistics.map(item => ({
  name: translateLevel(item.level),  // ✅ 转换为中文
  value: Number(item.count),         // ✅ 转换为数字
}));
```

### 3. 调试优先策略
**先打印数据再渲染**:
```typescript
console.log('=== 图表数据 ===', data);
console.log('=== 配置对象 ===', pieConfig);
```

### 4. 缓存清理流程
**修改代码后的标准流程**:
1. 清理 Vite 缓存
2. 重启开发服务器
3. 清理浏览器缓存
4. 强制刷新页面

---

## 📖 **相关资源**

- [@ant-design/charts 官方文档](https://charts.ant.design/)
- [G2 5.x 文档](https://g2.antv.antgroup.com/)
- [Vite 开发服务器配置](https://vitejs.dev/config/server-options.html)

---

## 📝 **版本信息**

- **@ant-design/charts**: 5.x (基于 G2 5.x)
- **Vite**: 8.x (基于 Rolldown)
- **Ant Design**: 5.x
- **最后更新**: 2026-03-28

---

**创建时间**: 2026-03-28  
**状态**: ✅ 生产环境验证通过  
**维护**: 客户标签系统开发团队
