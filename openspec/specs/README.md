# OpenSpec 源真相文档

本目录包含项目的源真相（Source of Truth）文档，是所有开发和决策的最终参考依据。

## 📁 目录结构

```
specs/
├── README.md                      # 本文件
├── requirements/                  # 需求规格说明
│   ├── business-requirements.md   # 业务需求
│   └── user-stories.md            # 用户故事
├── design/                        # 设计文档
│   ├── architecture.md            # 系统架构
│   ├── database-design.md         # 数据库设计
│   └── api-design.md              # API 设计规范
└── api/                           # API 规范
    ├── openapi.yaml               # OpenAPI/Swagger 规范
    └── api-contracts.md           # API 契约文档
```

## 📋 文档状态

| 文档类型 | 状态 | 说明 |
|---------|------|------|
| **业务需求** | ⏳ 待创建 | 定义业务目标和范围 |
| **用户故事** | ⏳ 待创建 | 从用户角度描述功能 |
| **系统架构** | ✅ 已实现 | 见 [changes/add-smart-tag-recommendation/design.md](../changes/add-smart-tag-recommendation/design.md) |
| **数据库设计** | ✅ 已实现 | 实体类和迁移脚本 |
| **API 规范** | ✅ 已实现 | Swagger 自动生成 |

## 🎯 文档用途

### requirements/ - 需求规格

定义项目的业务需求和用户需求，是所有功能开发的出发点。

**包含内容**:
- 业务背景和目标
- 问题陈述
- 用户画像
- 用户故事地图
- 功能需求清单
- 非功能需求（性能、安全等）

**模板示例**:
```markdown
# 业务需求：客户标签智能推荐

## 背景
当前客户标签管理系统存在以下痛点：
1. 标签创建效率低
2. 标签质量参差不齐
3. 标签重复率高

## 目标
1. 智能标签推荐
2. 标签标准化建议
3. 相似度检测
4. 使用场景预测

## 验收标准
- 用户可以一键生成推荐标签
- 推荐准确率 > 70%
- 标签重复率降低 50%
```

### design/ - 设计文档

详细描述系统的技术架构和设计决策。

**包含内容**:
- 架构图（C4 模型）
- 组件设计
- 数据模型
- 接口设计
- 技术选型
- 设计决策记录（ADR）

**现有文档**:
- ✅ [Phase 1 & 2 技术设计](../changes/add-smart-tag-recommendation/design.md) - v2.0

### api/ - API 规范

定义系统的 API 接口规范和契约。

**包含内容**:
- OpenAPI/Swagger 规范（YAML）
- API 版本管理策略
- 错误码规范
- 认证授权机制
- 请求/响应示例

**现有文档**:
- ✅ Swagger UI: http://localhost:3000/api/docs
- ✅ API 端点列表：[changes/add-smart-tag-recommendation/spec.md](../changes/add-smart-tag-recommendation/spec.md)

## 🔄 与变更文档的关系

```
specs/ (源真相)
  ↓ 派生
changes/ (变更管理)
  ↓ 实现
src/ (源代码)
```

- **specs/**: 定义"应该做什么"和"为什么做"
- **changes/**: 记录"如何做"和"做得怎么样"
- **src/**: 实际的代码实现

## 📝 文档维护原则

### 单一事实来源

- 需求文档以 `specs/requirements/` 为准
- 设计文档以 `specs/design/` 为准
- API 规范以 `specs/api/openapi.yaml` 为准

### 同步更新

当代码实现发生变化时：
1. 首先更新相关的 specs 文档
2. 然后更新 changes 文档
3. 最后更新代码注释

### 版本控制

- 所有 specs 文档都应该有版本号
- 重大变更需要创建新版本
- 保留历史版本以便追溯

## 🆘 如何使用

### 对于新成员

1. 先阅读 `specs/requirements/` 了解业务背景
2. 再查看 `specs/design/` 理解技术架构
3. 最后参考 `specs/api/` 学习接口规范

### 对于开发人员

1. 开发新功能前，先查阅相关 specs 文档
2. 如发现 specs 与实际不符，先更新 specs
3. 确保代码与 specs 保持一致

### 对于产品经理

1. 在 `specs/requirements/` 中定义需求
2. 跟踪需求在 changes 中的实现进度
3. 验收时对照 specs 进行验证

## 🔗 相关链接

- [OpenSpec 工作流指南](https://openspec.dev/docs/workflow)
- [需求工程最佳实践](https://www.iiba.org/business-analysis-body-of-knowledge/)
- [API 设计最佳实践](https://swagger.io/resources/articles/best-practices-in-api-design/)

---

**维护者**: AI Assistant  
**最后更新**: 2026-03-27  
**版本**: v1.0
