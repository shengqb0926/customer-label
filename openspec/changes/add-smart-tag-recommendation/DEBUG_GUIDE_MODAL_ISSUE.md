# 🔍 调试模式使用指南 - 新建规则空白页问题排查

## 📋 当前状态

### 服务启动信息

#### 后端服务
- **状态**: ✅ 运行中
- **端口**: 3000
- **API 地址**: http://localhost:3000/api/v1
- **Swagger**: http://localhost:3000/api/docs

#### 前端服务
- **状态**: ✅ 运行中 (Debug 模式)
- **端口**: 5176 (自动选择可用端口)
- **访问地址**: http://localhost:5176
- **日志级别**: Info (详细日志)

---

## 🎯 调试步骤

### 步骤 1: 访问应用

打开浏览器，访问:
```
http://localhost:5176
```

### 步骤 2: 登录系统

使用业务用户账号登录:
- **用户名**: `business_user`
- **密码**: `Business123`

### 步骤 3: 打开开发者工具

按 `F12` 打开浏览器开发者工具，切换到以下标签页:

1. **Console** - 查看调试日志
2. **Network** - 监控 API 请求
3. **Elements** - 检查 DOM 结构
4. **React DevTools** - 检查组件状态 (如已安装)

### 步骤 4: 导航到规则管理

点击左侧菜单的"规则管理",或访问:
```
http://localhost:5176/rules
```

### 步骤 5: 点击"新建规则"按钮

**关键操作**: 点击右上角的"➕ 新建规则"按钮

---

## 📊 预期看到的调试日志

### Console 标签页应该显示:

#### 1. RuleList 组件初始化
```
[RuleList Debug] 初始加载规则列表
[RuleList Debug] 状态变化：{ formVisible: false, editingRule: null, rulesCount: X, loading: false }
```

#### 2. 点击新建规则按钮时
```
[RuleList Debug] === 点击新建规则按钮 ===
[RuleList Debug] 设置 formVisible = true
[RuleList Debug] 设置 editingRule = null
[RuleList Render] 渲染 RuleFormModal, visible= true rule= null
```

#### 3. RuleFormModal 组件响应
```
[RuleFormModal Debug] Props 变化：{ visible: true, ruleId: undefined, ruleName: undefined }
[RuleFormModal Debug] 初始化表单数据，mode: 新建
[RuleFormModal Debug] Modal 显示状态变更：true
[RuleFormModal Render] 渲染 Modal 内容，visible= true
```

#### 4. 如果 100ms 后检查
```
[RuleList Debug] 100ms 后检查状态：{ formVisible: true, editingRule: null }
```

---

## 🐛 可能出现的错误及解决方案

### 错误场景 1: 没有任何调试日志

**现象**: 点击按钮后 Console 完全安静

**可能原因**:
- 按钮点击事件未绑定
- React 组件未正确挂载
- JavaScript 执行被阻止

**排查方法**:
```javascript
// 在 Console 中手动测试
const button = document.querySelector('button:contains("新建规则")');
console.log('按钮存在:', button !== null);
button?.click(); // 手动触发点击
```

### 错误场景 2: 看到日志但 Modal 未显示

**现象**: Console 显示 `visible= true`,但页面上看不到弹窗

**可能原因**:
- CSS z-index 层级问题 (被其他元素遮挡)
- Modal 渲染到 body 但被 overflow:hidden 裁剪
- Ant Design 样式未正确加载

**排查方法**:
1. 在 Elements 标签搜索 `.ant-modal`
2. 检查 Modal 元素的 computed styles
3. 临时修改 CSS:
```css
.ant-modal {
  z-index: 9999 !important;
  position: fixed !important;
}
```

### 错误场景 3: ExpressionEditor 或 TagsSelector 报错

**现象**: 看到错误日志
```
Error: Cannot find module './ExpressionEditor'
或
TypeError: Cannot read properties of undefined
```

**解决方案**:
- 检查组件导入路径
- 验证组件是否已正确编译
- 查看 Network 标签是否有资源加载失败 (404)

### 错误场景 4: 表单初始化失败

**现象**: 
```
[RuleFormModal Debug] 初始化表单数据，mode: 新建
[Error] 某些字段设置失败
```

**排查重点**:
- 检查 `form.resetFields()` 调用时机
- 验证 Form.Item 的 name 属性是否与 setFieldsValue 键名匹配

---

## 🔧 高级调试技巧

### 技巧 1: 手动触发弹窗

在 Console 中执行:
```javascript
// 假设能访问到 React 组件实例
const rootElement = document.getElementById('root');
const reactInstance = Object.keys(rootElement).find(key => key.startsWith('__reactInternalInstance'));
console.log('React 实例:', reactInstance);
```

### 技巧 2: 检查全局状态

```javascript
// 检查 useRuleStore 状态
import { useRuleStore } from '@/stores/ruleStore';
console.log('当前规则状态:', useRuleStore.getState());
```

### 技巧 3: 网络请求监控

在 Network 标签:
1. 过滤 `api` 关键字
2. 查看 `/api/v1/rules` 请求
3. 检查响应状态码和返回数据

### 技巧 4: React DevTools 组件树检查

安装 React DevTools 扩展后:
1. 切换到 Components 标签
2. 查找 `RuleList` 组件
3. 检查 Hooks 状态:
   - `formVisible` 应该是 `true`
   - `editingRule` 应该是 `null`
4. 向下查找 `RuleFormModal` 组件
5. 验证 props.visible === true

---

## 📝 调试日志收集模板

如果问题仍然存在，请复制以下信息:

### 1. Console 日志
````markdown
```
[在此粘贴完整的 Console 日志]
```
````

### 2. Network 请求
````markdown
- 点击新建规则时的所有 API 请求:
  - URL: 
  - Method: 
  - Status: 
  - Response: 
````

### 3. Elements 检查
````markdown
- 搜索 `.ant-modal` 的结果: [ ] 找到 [ ] 未找到
- Modal 元素的 HTML 结构:
```html
[在此粘贴 Modal 的 HTML]
```
````

### 4. React DevTools
````markdown
- RuleList 组件状态:
  - formVisible: 
  - editingRule: 
- RuleFormModal 组件 props:
  - visible: 
  - rule: 
````

---

## ✅ 验证成功的标准

当一切正常时，您应该看到:

### 视觉反馈
✅ 模态框从屏幕中央滑出  
✅ 标题显示"新建规则"  
✅ 表单字段完整显示:
   - 规则名称 (输入框)
   - 规则描述 (文本域)
   - 规则表达式 (Monaco 编辑器)
   - 推荐标签 (多选框)
   - 优先级 (滑块 1-100)
   - 状态开关 (活跃/停用)

### Console 日志顺序
```
1. [RuleList Debug] === 点击新建规则按钮 ===
2. [RuleList Debug] 设置 formVisible = true
3. [RuleList Render] 渲染 RuleFormModal, visible= true
4. [RuleFormModal Debug] Props 变化：{ visible: true }
5. [RuleFormModal Debug] 初始化表单数据，mode: 新建
6. [RuleFormModal Debug] Modal 显示状态变更：true
7. [RuleFormModal Render] 渲染 Modal 内容，visible= true
```

### Network 请求
- ❌ 不应该有新的 API 请求 (因为只是打开弹窗)
- ✅ 只应该有静态资源加载 (JS/CSS)

---

## 🚀 下一步行动

### 如果调试成功 (能看到弹窗)

恭喜！问题已解决。您可以:
1. 填写表单创建新规则
2. 或者告诉我"可以看到弹窗了"

### 如果仍然空白

请提供以下信息:

1. **Console 截图**: 包含所有日志
2. **页面截图**: 显示空白区域
3. **Elements 截图**: 显示 DOM 结构
4. **Network 截图**: 显示所有请求

根据具体日志，我可以进一步定位问题。

---

## 📞 快速反馈

在 Console 中看到日志后，请告诉我:

- ✅ **看到了哪些日志?** (复制前缀 `[RuleList` 或 `[RuleFormModal` 的日志)
- ✅ **Modal 是否显示?** (是/否)
- ✅ **有错误信息吗?** (复制完整错误)
- ✅ **Network 有失败请求吗?** (状态码 4xx/5xx)

根据您的反馈，我会立即调整调试策略!

---

## 🎉 当前配置总结

### 已启用的调试功能

| 功能 | 状态 | 说明 |
|------|------|------|
| **前端详细日志** | ✅ 启用 | Console 显示所有 debug 日志 |
| **后端普通模式** | ✅ 运行 | 正常处理 API 请求 |
| **Vite 不清屏** | ✅ 启用 | 保留完整历史日志 |
| **React 严格模式** | ⚠️ 可选 | 可通过 App.tsx 启用 |
| **Source Maps** | ✅ 默认 | 支持源码调试 |

### 访问信息

- **前端地址**: http://localhost:5176
- **后端地址**: http://localhost:3000
- **登录账号**: business_user / Business123
- **规则页面**: http://localhost:5176/rules

**准备好了吗？请点击"新建规则"按钮开始调试!** 🔍
