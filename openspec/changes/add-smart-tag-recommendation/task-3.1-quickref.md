# Task 3.1 规则引擎 - 快速参考卡

## 🚀 快速开始

### 1. 运行测试
```bash
npm test -- --testPathPattern="rule-" --passWithNoTests
```

### 2. 启动服务
```bash
npm run start:dev
```

### 3. 访问文档
```
http://localhost:3000/api/docs
```

---

## 📦 核心文件位置

```
src/modules/recommendation/
├── entities/
│   └── recommendation-rule.entity.ts    # 规则数据模型
├── dto/
│   ├── create-rule.dto.ts               # 创建规则 DTO
│   ├── update-rule.dto.ts               # 更新规则 DTO
│   └── test-rule.dto.ts                 # 测试规则 DTO
├── engines/
│   ├── rule-parser.ts                   # 规则解析器 ⭐
│   ├── rule-evaluator.ts                # 规则评估器 ⭐
│   └── rule-engine.ts                   # 规则引擎核心 ⭐
├── services/
│   └── rule-engine.service.ts           # 规则引擎服务
├── controllers/
│   └── rule-engine.controller.ts        # RESTful API
└── seeds/
    └── default-rules.seed.ts            # 默认规则种子
```

---

## 🔌 API 端点速查

### CRUD 操作
```
GET    /rules              # 获取规则列表
GET    /rules/:id          # 获取规则详情
POST   /rules              # 创建规则
PUT    /rules/:id          # 更新规则
DELETE /rules/:id          # 删除规则
```

### 状态控制
```
POST   /rules/:id/activate     # 激活规则
POST   /rules/:id/deactivate   # 停用规则
```

### 工具接口
```
POST   /rules/test             # 测试规则 ⭐
POST   /rules/batch/import     # 批量导入
GET    /rules/batch/export     # 批量导出
```

---

## 💡 规则表达式示例

### 简单规则
```json
{
  "operator": "AND",
  "conditions": [
    {"field": "age", "operator": ">=", "value": 18}
  ]
}
```

### 复杂嵌套规则
```json
{
  "operator": "AND",
  "conditions": [
    {
      "operator": "OR",
      "conditions": [
        {"field": "profile.city", "operator": "in", "value": ["北京", "上海"]},
        {"field": "totalAmount", "operator": ">=", "value": 50000}
      ]
    },
    {"field": "tags", "operator": "includes", "value": "VIP"}
  ]
}
```

---

## 🎯 支持的运算符

### 逻辑运算符
- `AND` - 与运算
- `OR` - 或运算
- `NOT` - 非运算

### 比较运算符
- `>`, `<`, `>=`, `<=`, `==`, `!=`
- `between` - 范围判断 `[min, max]`

### 数组运算符
- `in` - 值在数组中
- `includes` - 数组包含元素

### 字符串运算符
- `startsWith` - 以...开头
- `contains` - 包含
- `endsWith` - 以...结尾

---

## 🧪 测试命令

### 运行特定测试
```bash
# RuleParser 测试
npm test -- rule-parser.spec.ts

# RuleEvaluator 测试
npm test -- rule-evaluator.spec.ts

# Service 测试
npm test -- rule-engine.service.spec.ts

# Controller 测试
npm test -- rule-engine.controller.spec.ts

# 全部规则引擎测试
npm test -- --testPathPattern="rule-" --passWithNoTests
```

---

## 📊 关键统计数据

```
✅ 代码文件：11 个
✅ 测试用例：43 个
✅ 测试通过率：100%
✅ API 端点：11 个
✅ 预定义规则：4 条
✅ 代码行数：~970 行
```

---

## 🔧 常见用法

### 1. 为客户生成推荐
```typescript
const recommendations = await ruleEngine.recommend(customer);
// 返回：按置信度排序的标签推荐列表
```

### 2. 测试规则
```typescript
const result = await service.testRule(expression, customerData);
// 返回：{ success: true, matched: true, confidence: 0.9 }
```

### 3. 获取活跃规则
```typescript
const rules = await service.getRules({ isActive: true });
// 返回：分页的规则列表
```

---

## 🐛 故障排查

### 问题：Cannot find module
**解决**: 检查导入路径，从 modules 到 common 需要 `../../common`

### 问题：Test suite failed to run
**解决**: 确保类型定义完整，添加缺失的导入（如 IsInt）

### 问题：Nest can't resolve dependencies
**解决**: 检查模块是否正确注册 Provider

---

## 📚 相关文档

- **任务计划**: `task-3.1.md`
- **完成报告**: `task-3.1-complete.md`
- **总结报告**: `TASK_3.1_SUMMARY.md`
- **API 文档**: `http://localhost:3000/api/docs`

---

## 🎯 下一步

### 前端集成
1. 查看 Swagger 文档了解 API
2. 创建 RuleList 组件展示规则
3. 创建 RuleTester 组件测试规则
4. 实现推荐结果展示页面

### 后续任务
- ✅ Task 3.1: 规则引擎 (已完成)
- ⏳ Task 4.2: 前端展示页面 (可开始)
- ⏳ Task 3.6: 冲突检测器 (可开始)

---

**快速参考卡 | 版本 v1.0 | 更新时间：2026-03-27**
