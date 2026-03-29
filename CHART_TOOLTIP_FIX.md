# 图表 Tooltip 显示优化 - 完整信息展示

## 🐛 问题现象

用户反馈所有图表（饼图、柱状图）的 tooltip（鼠标悬停提示框）只显示数值，不显示分类名称。

**错误示例**:
```
❌ 只显示：88
```

**期望显示**:
```
✅ 低风险：88 人
✅ 中风险：88 人
✅ 高风险：74 人
```

---

## 🔍 问题诊断

### 原因分析

@ant-design/charts / G2 5.x 默认 tooltip 行为：
- **饼图**: 只显示 `value` 字段值
- **柱状图**: 只显示 `yField` 对应的值
- **不会自动包含分类名称**

### 解决方案

通过配置 `tooltip.formatter` 函数，自定义提示框内容格式。

---

## ✅ 修复方案

### 1. 客户等级分布饼图

```typescript
const levelPieConfig = {
  // ... 其他配置
  tooltip: {
    showMarkers: true,
    shared: true,
    formatter: (datum: { name: string; value: number }) => {
      return {
        name: datum.name,        // ✅ 分类名称（如：青铜）
        value: `${datum.value}人`, // ✅ 数值 + 单位
      };
    },
  },
};
```

**效果**:
```
青铜：28 人
白银：161 人
黄金：57 人
铂金：4 人
```

---

### 2. 风险等级分布饼图

```typescript
const riskPieConfig = {
  // ... 其他配置
  tooltip: {
    showMarkers: true,
    shared: true,
    formatter: (datum: { name: string; value: number }) => {
      return {
        name: datum.name,         // ✅ 分类名称（如：低风险）
        value: `${datum.value}人`,  // ✅ 数值 + 单位
      };
    },
  },
};
```

**效果**:
```
低风险：88 人
中风险：88 人
高风险：74 人
```

---

### 3. RFM 价值分布饼图

```typescript
const segmentPieConfig = {
  // ... 其他配置
  tooltip: {
    showMarkers: true,
    shared: true,
    formatter: (datum: { type: string; value: number }) => {
      return {
        name: datum.type,         // ✅ 分类名称（如：一般发展客户）
        value: `${datum.value}人`,  // ✅ 数值 + 单位
      };
    },
  },
};
```

**效果**:
```
一般发展客户：37 人
一般价值客户：31 人
重要发展客户：21 人
...
```

---

### 4. 城市分布 TOP10 柱状图

```typescript
const cityColumnConfig = {
  // ... 其他配置
  tooltip: {
    showMarkers: true,
    formatter: (datum: { city: string; count: number }) => {
      return {
        name: datum.city,         // ✅ 城市名称（如：北京）
        value: `${datum.count}人`,  // ✅ 数值 + 单位
      };
    },
  },
};
```

**效果**:
```
北京：50 人
上海：45 人
广州：40 人
...
```

---

### 5. RFM 分数分布柱状图

```typescript
const scoreColumnConfig = {
  // ... 其他配置
  tooltip: {
    showMarkers: true,
    formatter: (datum: { score: string; count: number }) => {
      return {
        name: datum.score,        // ✅ 分数段（如：3-5 分）
        value: `${datum.count}人`,  // ✅ 数值 + 单位
      };
    },
  },
};
```

**效果**:
```
3-5 分：XX 人
6-8 分：XX 人
9-11 分：XX 人
12-15 分：XX 人
```

---

## 📊 Tooltip 配置说明

### 完整配置项

```typescript
tooltip: {
  // 是否显示标记点
  showMarkers: true,
  
  // 是否共享 tooltip（多用于折线图/面积图）
  shared: true,
  
  // 自定义格式化函数
  formatter: (datum) => {
    return {
      name: datum.xxx,           // 标题/分类名
      value: `${datum.yyy}人`,   // 数值（可添加单位）
    };
  },
  
  // 可选：自定义样式
  // containerClassName: 'custom-tooltip',
}
```

### 可用的数据字段

根据图表类型和数据字段命名，可以访问以下属性：

| 图表类型 | 可用字段 | 说明 |
|----------|----------|------|
| 饼图 | `name`, `value`, `percent` | 名称、数值、占比 |
| 柱状图 | `xField`, `yField` | X 轴字段、Y 轴字段 |
| 折线图 | `x`, `y`, `series` | X 值、Y 值、系列名 |

---

## ✅ 编译验证

```bash
npm run build
```

**结果**: ✅ 编译成功，无错误

输出：
```
✓ 5361 modules transformed.
dist/assets/index-BUyJVMR-.js  3,980.62 kB │ gzip: 1,179.58 kB
✓ built in 2.50s
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

### 3. 测试所有图表 Tooltip

#### ✅ 客户等级分布饼图
鼠标悬停在各个扇区上，应显示：
```
青铜：28 人
白银：161 人
黄金：57 人
铂金：4 人
```

#### ✅ 风险等级分布饼图
鼠标悬停在各个扇区上，应显示：
```
低风险：88 人
中风险：88 人
高风险：74 人
```

#### ✅ RFM 价值分布饼图
鼠标悬停在各个扇区上，应显示：
```
一般发展客户：37 人
一般价值客户：31 人
重要发展客户：21 人
重要价值客户：16 人
...
```

#### ✅ 城市分布 TOP10 柱状图
鼠标悬停在各个柱子上，应显示：
```
[城市名]：XX 人
```

#### ✅ RFM 分数分布柱状图
鼠标悬停在各个柱子上，应显示：
```
3-5 分：XX 人
6-8 分：XX 人
9-11 分：XX 人
12-15 分：XX 人
```

---

## 🎯 技术要点

### 1. Tooltip Formatter 返回值

```typescript
// ✅ 返回对象格式
formatter: (datum) => {
  return {
    name: '分类名称',
    value: '数值',
  };
}

// ❌ 不要返回字符串
formatter: (datum) => `${datum.name}: ${datum.value}` // 不支持！
```

### 2. 数据类型匹配

确保 formatter 参数类型与实际数据字段一致：

```typescript
// 饼图：使用 name 和 value
formatter: (datum: { name: string; value: number }) => {...}

// 柱状图：使用 xField 和 yField
formatter: (datum: { city: string; count: number }) => {...}
```

### 3. 单位添加

可以在 value 后添加中文单位：

```typescript
value: `${datum.value}人`     // ✅ 人数
value: `${datum.value}%`      // ✅ 百分比
value: `¥${datum.value}`      // ✅ 金额
```

---

## 📝 相关资源

### 官方文档
- [@ant-design/charts Tooltip](https://charts.ant.design/zh/docs/api/options/common#tooltip)
- [G2 5.x Tooltip Configuration](https://g2.antv.antgroup.com/api/options/tooltip)

### 常见问题
- [Tooltip 自定义内容](https://g2.antv.antgroup.com/manual/concepts/tooltip#custom-content)
- [Tooltip 样式定制](https://g2.antv.antgroup.com/api/options/tooltip)

---

## ✅ 验收标准

- [x] 编译无错误
- [x] 所有饼图添加 tooltip 配置
- [x] 所有柱状图添加 tooltip 配置
- [ ] 客户等级分布饼图 tooltip 显示完整信息
- [ ] 风险等级分布饼图 tooltip 显示完整信息
- [ ] RFM 价值分布饼图 tooltip 显示完整信息
- [ ] 城市分布柱状图 tooltip 显示完整信息
- [ ] RFM 分数分布柱状图 tooltip 显示完整信息
- [ ] Tooltip 格式统一（分类名：数值 + 单位）

---

**修复完成时间**: 2026-03-28 19:30  
**状态**: ✅ 已完成并编译通过  
**测试**: 待刷新浏览器后验证  

🎉 **现在请刷新浏览器（Ctrl+F5），鼠标悬停在各个图表上查看完整的 tooltip 信息！**
