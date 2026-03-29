# 2026-03-28 开发经验与教训总结

## 📅 **今日工作概况**

**主要任务**: 修复客户统计分析页面饼图显示 `undefined` 的问题  
**涉及模块**: 前端饼图配置、Ant Design 5.x API 兼容性、浏览器缓存处理  
**最终状态**: ✅ 已修复并验证，创建完整的开发规范文档

---

## 🎯 **核心问题与解决方案**

### 问题 1: 饼图 Label 显示 `undefined: XX%`

#### 问题现象
```
青铜 → undefined: 11.2%
白银 → undefined: 64.4%
```

#### 根本原因
@ant-design/charts 5.x / G2 5.x 对数据字段有严格要求：
- ❌ 使用 `type` 字段：`{ type: '青铜', value: 28 }`
- ✅ 必须使用 `name` 字段：`{ name: '青铜', value: 28 }`

#### 解决方案
```typescript
// ❌ 错误写法
const data = statistics.map(item => ({
  type: item.level,
  value: item.count,
}));
label: { content: (datum) => `${datum.type}: ...` }

// ✅ 正确写法
const data = statistics.map(item => ({
  name: item.level,
  value: item.count,
}));
label: { content: (datum) => `${datum.name}: ...` }
```

#### 教训
1. **不要假设图表库会隐式映射字段**
2. **直接使用标准字段名** (`name`/`value`)
3. **参考官方示例的数据格式**

---

### 问题 2: `Unknown Component: shape.outer` 错误

#### 问题现象
```
Uncaught (in promise) Error: Unknown Component: shape.outer
```

#### 根本原因
在 RFM 饼图配置中使用了已废弃的 `type: 'outer'` 属性。

#### 解决方案
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

#### 教训
1. **Ant Design 5.x 已废弃 `type: 'outer'`**
2. **label 配置只需 `content` 属性**
3. **注意 API 版本兼容性**

---

### 问题 3: Ant Design 5.x 组件警告

#### 警告列表
```
Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.
Warning: [antd: Spin] `tip` is deprecated. Please use `description` instead.
Warning: [antd: Alert] `message` is deprecated. Please use `title` instead.
Warning: [antd: Card] `bordered` is deprecated. Please use `variant` instead.
Warning: [antd: Statistic] `valueStyle` is deprecated. Please use `styles.content` instead.
```

#### 解决方案对照表
| 组件 | 废弃属性 | 新属性 |
|------|---------|--------|
| Modal | `destroyOnClose`, `onClose` | `destroyOnHidden` |
| Spin | `tip` | `description` |
| Alert | `message` | `title` |
| Card | `bordered` | `variant` |
| Statistic | `valueStyle` | `styles.content` |

#### 教训
1. **升级 Ant Design 5.x 后需全面检查废弃 API**
2. **使用 TypeScript 严格模式可提前发现问题**
3. **定期查看官方迁移指南**

---

### 问题 4: 浏览器强缓存导致代码不更新

#### 问题现象
- 代码已修改并编译
- 重启了开发服务器
- 浏览器仍显示旧效果（undefined）
- Sources 中找不到最新代码

#### 根本原因
Vite 8.x 使用强缓存策略：
- 开发模式下自动热更新
- 但浏览器可能缓存旧模块
- 即使 Network 勾选 "Disable cache" 仍可能失效

#### 解决方案（按优先级）

##### 方案 1: 强制刷新
```
Ctrl + Shift + R
或
Ctrl + F5
```

##### 方案 2: 清理 Vite 缓存 + 重启服务
```bash
# Git Bash
cd frontend
rm -rf node_modules/.vite
taskkill //F //PID <端口占用进程>
npm run dev
```

##### 方案 3: 完全清理浏览器缓存
1. `Ctrl + Shift + Delete`
2. 时间范围：全部时间
3. 勾选：缓存的图片和文件
4. 清除数据
5. **完全关闭浏览器**
6. 重新打开并访问

##### 方案 4: 开发时永久禁用缓存
1. F12 → Network 标签
2. 勾选 "Disable cache"
3. 保持开发者工具打开

#### 教训
1. **修改代码后必须清理 Vite 缓存**
2. **必须完全关闭浏览器（不只是标签页）**
3. **开发时建议永久禁用缓存**
4. **使用无痕模式可快速验证**

---

## ✅ **最佳实践总结**

### 1. @ant-design/charts 数据规范

#### 永远使用标准字段名
```typescript
// ✅ 推荐
const data = [
  { name: '分类 A', value: 100 },
  { name: '分类 B', value: 200 },
];

// ❌ 避免
const data = [
  { type: '分类 A', value: 100 },
  { category: '分类 A', value: 100 },
];
```

#### 配置必须匹配数据字段
```typescript
{
  angleField: 'value',
  colorField: 'name',  // ✅ 必须与数据字段名一致
  label: {
    content: (datum) => `${datum.name}: ...`  // ✅ 直接访问
  }
}
```

---

### 2. 调试流程规范

#### 添加调试日志
```typescript
// 数据准备后
console.log('=== 图表数据 ===', chartData);

// label content 中
label: {
  content: (datum: any) => {
    console.log('Datum:', datum);  // ✅ 查看实际字段
    return `${datum.name}: ...`;
  }
}
```

#### 验证步骤
1. Console 查看数据格式
2. Console 查看 datum 对象
3. Sources 搜索最新代码
4. Network 查看加载的文件

---

### 3. 缓存清理标准流程

#### 开发期间修改代码后
```bash
# 1. 停止服务
# Ctrl + C

# 2. 清理 Vite 缓存
cd frontend
rm -rf node_modules/.vite

# 3. 重启服务
npm run dev
```

#### 浏览器端
```
1. Ctrl + Shift + Delete（清理缓存）
2. Alt + F4（完全关闭浏览器）
3. 重新打开浏览器
4. Ctrl + Shift + R（强制刷新）
```

---

### 4. Ant Design 5.x API 兼容性检查

#### 常见废弃 API 清单
```typescript
// Modal
❌ destroyOnClose → ✅ destroyOnHidden
❌ onClose → ✅ 只使用 onCancel

// Spin
❌ tip → ✅ description

// Alert
❌ message → ✅ title

// Card
❌ bordered={false} → ✅ variant="outlined"

// Statistic
❌ valueStyle → ✅ styles.content
```

#### 检查工具
```bash
# 使用 grep 搜索废弃属性
grep -r "destroyOnClose" frontend/src/
grep -r "tip=" frontend/src/
grep -r "bordered={false}" frontend/src/
```

---

## 📋 **开发检查清单**

### 数据准备阶段
- [ ] 使用 `name` + `value` 字段（不是 `type`/`count`）
- [ ] 数值字段转换为数字：`Number(item.count)`
- [ ] 添加调试日志：`console.log('=== 数据 ===', data)`

### 图表配置阶段
- [ ] `colorField: 'name'`（与数据字段一致）
- [ ] 移除 `type: 'outer'` 等废弃属性
- [ ] label content 使用 `datum.name`
- [ ] 添加调试日志到 label content

### 编译阶段
- [ ] `npm run build` 无编译错误
- [ ] 清理 Vite 缓存：`rm -rf node_modules/.vite`
- [ ] 重启开发服务器

### 浏览器测试阶段
- [ ] 完全关闭浏览器
- [ ] 清理浏览器缓存
- [ ] 强制刷新页面
- [ ] Console 显示正确数据
- [ ] 饼图显示正确标签

---

## 🎯 **关键技术点**

### 1. @ant-design/charts 字段映射机制

**G2 5.x 不会自动映射字段名**：
- 配置 `colorField: 'type'` 只影响颜色映射
- label 和 tooltip 中必须使用实际的字段名
- **永远使用 `name` + `value` 标准组合**

### 2. Vite 8.x 缓存策略

**开发模式**:
- 自动热更新（HMR）
- 但浏览器可能缓存旧模块
- 需要手动清理 `node_modules/.vite`

**生产模式**:
- 文件名包含哈希值
- 浏览器强缓存带哈希的文件
- 只有哈希改变才会重新加载

### 3. Ant Design 5.x 迁移要点

**组件 API 变化**:
- Modal: 移除 `onClose`, 使用 `destroyOnHidden`
- Spin: `tip` → `description`
- Alert: `message` → `title`
- Card: `bordered` → `variant`
- Statistic: `valueStyle` → `styles.content`

---

## 📖 **创建的文档**

### 1. 开发规范文档
📄 [`ANT_DESIGN_CHARTS_PIE_SPEC.md`](d:\VsCode\customer-label\ANT_DESIGN_CHARTS_PIE_SPEC.md)
- @ant-design/charts 5.x 饼图完整开发规范
- 数据准备、图表配置、调试技巧
- 常见问题与解决方案
- 开发检查清单

### 2. 调试指南
📄 [`PIE_CHART_DEBUG_GUIDE.md`](d:\VsCode\customer-label\PIE_CHART_DEBUG_GUIDE.md)
- 深度调试步骤
- Console 日志分析
- 问题定位方法

### 3. 缓存清理指南
📄 [`FORCE_REFRESH_GUIDE.md`](d:\VsCode\customer-label\FORCE_REFRESH_GUIDE.md)
- 5 种清理缓存的方法
- 验证步骤
- 终极解决方案

---

## 💡 **经验教训**

### 1. 不要依赖隐式行为
❌ 假设图表库会自动映射字段  
✅ 直接使用标准字段名

### 2. 调试优先于猜测
❌ 凭感觉尝试各种方案  
✅ 先打印数据查看实际值

### 3. 缓存是万恶之源
❌ 只刷新页面  
✅ 清理所有缓存（Vite + 浏览器）

### 4. 版本兼容性至关重要
❌ 忽略废弃 API 警告  
✅ 立即更新到新 API

### 5. 文档化是最佳实践
❌ 解决问题就结束  
✅ 创建完整的规范文档

---

## 🚀 **下一步行动**

### 短期（本周）
- [ ] 全面检查项目中所有 @ant-design/charts 配置
- [ ] 统一使用 `name` + `value` 字段
- [ ] 移除所有废弃的 Ant Design API
- [ ] 在开发环境永久禁用浏览器缓存

### 中期（本月）
- [ ] 建立前端组件 API 兼容性检查流程
- [ ] 创建常见问题快速排查手册
- [ ] 自动化缓存清理脚本

### 长期（持续）
- [ ] 定期查看官方文档更新
- [ ] 建立技术债务追踪机制
- [ ] 持续优化开发体验

---

**总结时间**: 2026-03-28 21:45  
**作者**: 客户标签系统开发团队  
**状态**: ✅ 已完成并文档化  
**下次回顾**: 2026-04-04
