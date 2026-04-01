# 📚 文档模板仓库 (Documentation Templates)

本仓库包含 customer-label 项目的完整文档体系和规范标准。

---

## 📁 目录结构

```
docs-templates/
├── README.md                          # 本文件
├── INDEX.md                           # 文档索引（导航）
│
├── standards/                         # 规范标准类
│   ├── CODING_STANDARDS.md           # 开发规范 ✅
│   ├── DESIGN_GUIDELINES.md          # 设计规范 ✅
│   ├── TESTING_GUIDELINES.md         # 测试规范 ✅
│   ├── OPERATIONS_GUIDELINES.md      # 运维规范 ✅
│   ├── SECURITY_GUIDELINES.md        # 安全规范 ✅
│   ├── PERFORMANCE_GUIDELINES.md     # 性能优化规范 ✅
│   └── CODE_REVIEW_CHECKLIST.md      # 代码审查清单 ✅
│
├── architecture/                      # 架构设计类
│   ├── SYSTEM_ARCHITECTURE.md        # 系统架构设计模板
│   ├── DATABASE_DESIGN.md            # 数据库设计模板
│   └── API_DESIGN.md                 # API 接口设计模板
│
├── requirements/                      # 需求分析类
│   ├── PRD_TEMPLATE.md               # 产品需求文档模板
│   ├── USER_STORIES.md               # 用户故事模板
│   └── PROTOTYPE_DESIGN.md           # 原型设计模板
│
├── test/                              # 测试相关类
│   ├── TEST_PLAN.md                  # 测试计划模板
│   ├── TEST_CASES.md                 # 测试用例模板
│   ├── TEST_REPORT_TEMPLATE.md       # 测试报告模板
│   └── BUG_TRACKING.md               # Bug 追踪模板
│
├── deployment/                        # 部署运维类
│   ├── DEPLOYMENT_GUIDE.md           # 部署手册模板
│   ├── ACCEPTANCE_REPORT.md          # 验收报告模板
│   └── USER_MANUAL.md                # 用户手册模板
│
├── operations/                        # 运维监控类
│   ├── MONITORING_SETUP.md           # 监控配置模板
│   ├── INCIDENT_REPORT.md            # 事件复盘模板
│   └── RUNBOOK_TEMPLATE.md           # 运维操作手册模板
│
└── guides/                            # 指南教程类
    ├── GETTING_STARTED.md            # 快速入门指南
    ├── TROUBLESHOOTING.md            # 故障排查指南
    └── BEST_PRACTICES.md             # 最佳实践集合
```

---

## 🎯 使用指南

### 1. 创建新文档

当需要创建新文档时，从模板仓库复制对应模板：

```bash
# 示例：创建产品需求文档
cp docs-templates/requirements/PRD_TEMPLATE.md docs/PRODUCT_REQUIREMENTS.md

# 编辑新文档
vim docs/PRODUCT_REQUIREMENTS.md
```

### 2. 规范文档直接引用

规范类文档应直接在项目中引用和执行：

```bash
# 示例：代码审查时参照检查单
cat docs-templates/standards/CODE_REVIEW_CHECKLIST.md

# 示例：编写测试用例参照测试规范
cat docs-templates/standards/TESTING_GUIDELINES.md
```

### 3. 更新模板

当发现模板需要改进时：

```bash
# 1. 在模板仓库中修改
vim docs-templates/standards/CODING_STANDARDS.md

# 2. 提交变更
git add docs-templates/
git commit -m "docs: 更新开发规范模板"

# 3. 通知团队同步
```

---

## 📋 文档优先级

| 优先级 | 类型 | 必须性 | 示例 |
|--------|------|--------|------|
| **P0** | 规范标准 | 强制执行 | CODING_STANDARDS.md |
| **P1** | 核心文档 | 项目必备 | PRD, 架构设计 |
| **P2** | 辅助文档 | 推荐使用 | 用户手册，最佳实践 |

---

## 🔄 维护机制

### 定期审查

- **频率**: 每季度一次
- **参与者**: 技术负责人 + 文档管理员
- **检查项**:
  - 文档是否与代码一致
  - 是否有过期内容
  - 是否有缺失章节

### 版本控制

- 文档版本号与项目版本一致
- 重大变更在 CHANGELOG.md 中记录
- 废弃文档标记 [DEPRECATED]

---

## 📊 文档成熟度评估

| 等级 | 特征 | 本项目状态 |
|------|------|-----------|
| L1 初始级 | 口头沟通为主 | ❌ |
| L2 可重复级 | 关键文档齐全 | ✅ 已达成 |
| L3 已定义级 | 标准化模板 | ✅ 当前目标 |
| L4 已管理级 | 质量度量 | ⏳ 进行中 |
| L5 优化级 | 数据驱动 | ⏳ 长期目标 |

---

## 🎁 附录：快速链接

### 核心规范（必读）

- [开发规范](standards/CODING_STANDARDS.md) - 命名/目录/Git/注释
- [设计规范](standards/DESIGN_GUIDELINES.md) - ADR/UI/设计模式
- [测试规范](standards/TESTING_GUIDELINES.md) - 分层/Mock/覆盖率
- [代码审查清单](standards/CODE_REVIEW_CHECKLIST.md) - 审查检查项

### 架构文档

- [系统架构设计](architecture/SYSTEM_ARCHITECTURE.md) - 整体架构
- [推荐引擎架构](../../RECOMMENDATION_ENGINES_ARCHITECTURE.md) - 四大引擎详解

### 项目文档

- [AI 辅助开发文档指南](../../AI_PROJECT_DOCUMENTATION_GUIDE.md) - 文档体系总览
- [Phase 2 完成总结](../../PHASE2_COMPLETE_SUMMARY.md) - 缓存模块开发

---

**文档版本**: v1.0  
**编制日期**: 2026-03-30  
**维护人**: 技术委员会  
**联系方式**: tech-committee@example.com

**© 2026 客户标签推荐系统项目组 版权所有**
