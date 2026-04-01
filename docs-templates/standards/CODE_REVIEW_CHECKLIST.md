# 代码审查检查单 (Code Review Checklist)

**版本**: v1.0  
**生效日期**: 2026-03-30  
**适用范围**: customer-label 项目全体开发人员

---

## 📋 一、通用检查项（所有代码）

### 1.1 代码质量

- [ ] 遵循命名规范（camelCase/PascalCase/UPPER_SNAKE_CASE）
- [ ] 函数长度 < 50 行
- [ ] 类长度 < 300 行
- [ ] 圈复杂度 < 10
- [ ] 无重复代码（DRY 原则）
- [ ] 单一职责原则（SRP）
- [ ] 开闭原则（对扩展开放，对修改关闭）

### 1.2 代码风格

- [ ] 已通过 ESLint 检查（无 Error/Warn）
- [ ] 已通过 Prettier 格式化
- [ ] 缩进一致（2 空格）
- [ ] 行宽 < 120 字符
- [ ] 括号使用一致（即使单行也使用 `{}`）

### 1.3 注释与文档

- [ ] 文件头包含作者和日期
- [ ] 公共 API 有 JSDoc 注释
- [ ] 复杂逻辑有解释性注释
- [ ] 注释是 WHY 而非 WHAT
- [ ] 无过时的注释
- [ ] 无 TODO/FIXME 遗留（或已创建 Issue）

---

## 🔒 二、安全检查项（强制）

### 2.1 输入验证

- [ ] 所有外部输入都经过验证（class-validator）
- [ ] SQL 查询使用参数化（无字符串拼接）
- [ ] 数字类型有范围校验（Min/Max）
- [ ] 字符串有长度限制（MaxLength）
- [ ] 枚举值有效性检查

### 2.2 认证授权

- [ ] 敏感接口有 JWT 认证
- [ ] 权限校验正确（RolesGuard）
- [ ] 资源所有权验证
- [ ] Token 存储安全（HttpOnly Cookie）
- [ ] 密码加密存储（bcrypt）

### 2.3 数据安全

- [ ] 敏感数据响应脱敏（邮箱/手机号）
- [ ] 无硬编码密钥（使用环境变量）
- [ ] XSS 防护（输出转义）
- [ ] CSRF 防护（Token 验证）
- [ ] 文件上传类型和大小限制

---

## 🧪 三、测试检查项

### 3.1 单元测试

- [ ] 新增功能有对应单元测试
- [ ] 测试覆盖正常路径
- [ ] 测试覆盖异常路径
- [ ] 测试覆盖边界条件
- [ ] Mock 外部依赖（数据库/API）
- [ ] 测试断言具体明确
- [ ] 测试用例独立可并行

### 3.2 测试覆盖率

- [ ] Statements >= 30%（短期目标）
- [ ] Branches >= 25%
- [ ] Functions >= 35%
- [ ] Lines >= 30%
- [ ] 核心模块覆盖率 >= 80%

### 3.3 集成测试

- [ ] 关键业务流程有集成测试
- [ ] API 端到端测试通过
- [ ] 数据库事务回滚正确
- [ ] 缓存服务 Mock 或使用 TestContainers

---

## ⚡ 四、性能检查项

### 4.1 数据库性能

- [ ] 查询字段有索引
- [ ] 避免 N+1 查询（使用 JOIN）
- [ ] 批量操作使用事务
- [ ] 大数据量分页处理
- [ ] 慢查询已优化（EXPLAIN ANALYZE）

### 4.2 缓存使用

- [ ] 热点数据已添加缓存
- [ ] 缓存键命名规范（prefix:key）
- [ ] TTL 设置合理
- [ ] 缓存失效策略正确
- [ ] 缓存穿透防护（布隆过滤器）

### 4.3 算法优化

- [ ] 循环内无同步 I/O
- [ ] 耗时操作异步处理
- [ ] 大数据集流式处理
- [ ] 递归有终止条件
- [ ] 时间复杂度可接受（O(n²) 需评审）

---

## 🏗️ 五、架构检查项

### 5.1 模块化

- [ ] 遵循目录结构规范
- [ ] 模块职责清晰
- [ ] 依赖注入正确
- [ ] 无循环依赖
- [ ] 公共代码提取到 common 模块

### 5.2 设计模式

- [ ] 适当使用设计模式（非过度设计）
- [ ] 策略模式用于多算法切换
- [ ] 工厂模式用于对象创建
- [ ] 装饰器模式用于横切关注点
- [ ] 观察者模式用于事件驱动

### 5.3 错误处理

- [ ] 异常捕获粒度合适
- [ ] 自定义异常类
- [ ] 错误日志记录完整（含堆栈）
- [ ] 用户友好错误提示
- [ ] 无吞掉异常（空 catch）

---

## 🎨 六、前端专项检查

### 6.1 React 组件

- [ ] 组件职责单一
- [ ] Props 类型定义完整（TypeScript）
- [ ] 使用 Hooks 抽取复用逻辑
- [ ] 避免过度渲染（React.memo）
- [ ] 清理副作用（useEffect cleanup）
- [ ] 受控组件与非受控组件使用正确

### 6.2 状态管理

- [ ] 优先使用本地状态
- [ ] 全局状态必要性论证
- [ ] 避免状态冗余
- [ ] 状态更新不可变性

### 6.3 用户体验

- [ ] Loading 状态友好
- [ ] 错误提示清晰
- [ ] 表单验证及时
- [ ] 防抖节流应用合理
- [ ] 键盘快捷键支持
- [ ] 响应式布局适配

---

## 🔄 七、Git 提交检查项

### 7.1 提交信息

- [ ] 遵循 Conventional Commits 规范
- [ ] Type 正确（feat/fix/docs/test/refactor/chore）
- [ ] Scope 准确（模块名）
- [ ] Subject 简洁（< 50 字符，祈使句）
- [ ] Body 详细说明变更原因（可选）
- [ ] Footer 引用 Issue（Closes: #123）

### 7.2 分支管理

- [ ] 从 develop 分支创建功能分支
- [ ] 分支命名规范（feature/xxx）
- [ ] 及时合并 develop 解决冲突
- [ ] 功能完成后删除分支

### 7.3 代码历史

- [ ] 提交粒度适中（每个提交一个逻辑变更）
- [ ] 无大量无关文件（node_modules/.gitignore）
- [ ] 敏感信息未提交（.env/密钥）
- [ ] 提交顺序逻辑清晰

---

## 📝 八、文档检查项

### 8.1 代码文档

- [ ] README.md 已更新（如有新功能）
- [ ] API 文档同步更新（Swagger）
- [ ] 配置文件说明完整（.env.example）
- [ ] 部署步骤更新（DEPLOYMENT.md）

### 8.2 变更文档

- [ ] CHANGELOG.md 已更新
- [ ] 迁移指南（BREAKING CHANGE）
- [ ] 技术债务登记簿更新

---

## 🎯 九、AI 生成代码专项检查

由于本项目使用 AI 辅助编程，需额外检查：

### 9.1 AI 幻觉识别

- [ ] 引用的库确实存在且已安装
- [ ] API 调用方式正确（非 AI 臆造）
- [ ] 类型定义与实际一致
- [ ] 业务逻辑符合需求（非 AI 自由发挥）

### 9.2 代码一致性

- [ ] 与现有代码风格统一
- [ ] 命名与项目其他部分一致
- [ ] 遵循项目约定优于个人偏好

### 9.3 安全性复查

- [ ] AI 生成的加密代码经过审查
- [ ] AI 生成的验证逻辑无绕过可能
- [ ] 权限检查未被 AI 移除

---

## ✅ 十、审查流程

### 10.1 自审（作者）

在发起 PR 前，作者必须完成：

```bash
# 1. 运行测试
npm test

# 2. 检查覆盖率
npm test -- --coverage

# 3. 运行 lint
npm run lint

# 4. 本地构建
npm run build

# 5. 自测核心功能
# （根据变更内容手动测试）
```

然后填写 PR 模板：

```markdown
## 变更描述
简要说明此 PR 的目的

## 变更类型
- [ ] ✨ 新功能
- [ ] 🐛 Bug 修复
- [ ] ♻️ 重构
- [ ] 📝 文档更新
- [ ] ⚡ 性能优化

## 测试情况
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试通过

## 截图/录屏
（如适用）

## 相关 Issue
Closes: #123
```

### 10.2 他审（Reviewer）

至少需要 1 名 Reviewer 批准：

- [ ] 使用 GitHub Review 功能
- [ ] 逐行审查变更（Diff）
- [ ] 提出建设性意见
- [ ] 标记需要修改的问题
- [ ] 批准后合并（Approve & Merge）

### 10.3 合并策略

- [ ] 使用 Squash and Merge（压缩提交历史）
- [ ] 删除源分支
- [ ] 验证 CI/CD 流水线通过
- [ ] 通知相关人员

---

## 📊 十一、常见问题与反模式

### ❌ 反面教材

```typescript
// 1. 过长函数（> 200 行）
async processCustomerData(customer: Customer): Promise<void> {
  // 100 行验证逻辑
  // 50 行数据处理
  // 50 行保存逻辑
  // ... 应该拆分为多个小函数
}

// 2. 深层嵌套（> 3 层）
if (condition1) {
  if (condition2) {
    if (condition3) {
      // 业务逻辑
    }
  }
}

// 3. 魔法数字
if (customer.totalAssets >= 5000000) {  // 硬编码阈值
  // ...
}

// 4. 重复代码
// 在三个文件中都有相同的验证逻辑
const isValid = email.includes('@') && email.includes('.');

// 5. 过大类（> 500 行）
@Injectable()
export class GodClassService {
  // 包含客户、订单、支付、物流...所有逻辑
}
```

### ✅ 正面示例

```typescript
// 1. 拆分后的函数
async processCustomerData(customer: Customer): Promise<void> {
  this.validateCustomer(customer);
  const processed = this.transformCustomer(customer);
  await this.saveCustomer(processed);
}

// 2. 扁平化逻辑
if (!condition1 || !condition2 || !condition3) return;
// 业务逻辑

// 3. 具名常量
const VIP_ASSET_THRESHOLD = 5000000;
if (customer.totalAssets >= VIP_ASSET_THRESHOLD) {
  // ...
}

// 4. 提取公共函数
// utils/validation.ts
export function isValidEmail(email: string): boolean {
  return email.includes('@') && email.includes('.');
}

// 5. 单一职责类
@Injectable()
export class CustomerValidationService {
  // 只负责验证逻辑
}

@Injectable()
export class CustomerTransformationService {
  // 只负责转换逻辑
}
```

---

## 📚 十二、参考资源

### 12.1 代码审查工具

- [GitHub Pull Requests](https://github.com/features/code-review)
- [Phabricator](https://phabricator.org/)
- [Gerrit](https://www.gerritcodereview.com/)

### 12.2 推荐书籍

- 《代码整洁之道》(Clean Code)
- 《代码审查实践》(Code Review Best Practices)
- 《重构：改善既有代码的设计》

---

**文档版本**: v1.0  
**编制日期**: 2026-03-30  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
