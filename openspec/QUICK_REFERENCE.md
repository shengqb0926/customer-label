# OpenSpec 文档快速参考

## 📂 文档位置

```
customer-label/openspec/
├── README.md                          # 🔰 总览入口（新增）
├── DOCUMENT_UPDATE_SUMMARY.md         # 📝 更新总结（新增）
├── config.yaml                        # ⚙️ 配置文件
├── changes/
│   └── add-smart-tag-recommendation/
│       ├── README.md                  # 📊 变更总览 ✅ v2.0
│       ├── proposal.md                # 💡 变更提案 ✅ v2.0
│       ├── spec.md                    # 📋 功能规范 ✅ v2.0
│       ├── design.md                  # 🏗️ 技术设计 ✅ v2.0
│       ├── tasks.md                   # ✅ 任务列表 ✅ v2.0
│       ├── PHASE_1_COMPLETE.md        # ✅ Phase 1 报告
│       ├── PHASE_2_COMPLETE.md        # ✅ Phase 2 报告
│       └── task-*.md                  # ✅ 任务报告集
└── specs/
    └── README.md                      # 📚 源真相说明（新增）
```

## 🎯 快速导航

### 我想了解项目概况
→ [openspec/README.md](./README.md)  
→ [changes/add-smart-tag-recommendation/README.md](./changes/add-smart-tag-recommendation/README.md)

### 我想知道为什么要做这个功能
→ [proposal.md](./changes/add-smart-tag-recommendation/proposal.md) - 背景和目标

### 我想知道功能的具体需求
→ [spec.md](./changes/add-smart-tag-recommendation/spec.md) - Given/When/Then 格式

### 我想知道技术实现方案
→ [design.md](./changes/add-smart-tag-recommendation/design.md) - 架构和组件设计

### 我想知道任务分解和进度
→ [tasks.md](./changes/add-smart-tag-recommendation/tasks.md) - WBS 和完成率

### 我想看某个阶段的完成报告
→ [PHASE_1_COMPLETE.md](./changes/add-smart-tag-recommendation/PHASE_1_COMPLETE.md)  
→ [PHASE_2_COMPLETE.md](./changes/add-smart-tag-recommendation/PHASE_2_COMPLETE.md)

### 我想知道如何开始开发
→ [QUICKSTART.md](../../QUICKSTART.md) - 快速启动指南  
→ [PROJECT_ONBOARDING.md](../../PROJECT_ONBOARDING.md) - 项目入门

### 我想知道代码规范
→ [CODE_STYLE_GUIDE.md](../../CODE_STYLE_GUIDE.md) - 代码风格  
→ [DEVELOPMENT_CHECKLIST.md](../../DEVELOPMENT_CHECKLIST.md) - 开发清单

## 📊 当前状态（2026-03-27）

| 指标 | 数值 | 状态 |
|------|------|------|
| **完成阶段** | Phase 1 & 2 | ✅ 100% |
| **总体进度** | 40% | 🔄 进行中 |
| **代码行数** | ~4750 行 | 📈 |
| **API 端点** | 21 个 | ✅ |
| **测试用例** | 34 个 | ✅ 通过率 100% |
| **文档数量** | 25 个 | 📚 |
| **质量评级** | ⭐⭐⭐⭐⭐ | 5/5 |

## 🚀 下一步行动

### P0 优先级（立即开始）
- **Task 3.1**: 规则引擎开发（16 小时）
- 预期成果：基于规则的推荐功能

### P1 优先级（本周内）
- **Task 3.6**: 冲突检测器开发（8 小时）
- **Task 4.2**: 前端展示页面（12 小时）

### P2 优先级（下周）
- **Task 3.2**: 聚类引擎开发（20 小时）
- **Task 3.3**: 关联引擎开发（12 小时）

## 📝 常用命令

### OpenSpec 命令
```bash
# 初始化
openspec init

# 创建变更
openspec change create <name>

# 审查变更
openspec change review <name>

# 合并变更
openspec change merge <name>
```

### 开发命令
```bash
# 后端启动
npm run dev

# 前端启动
cd frontend && npm run dev

# 运行测试
npm test

# 生成覆盖率
npm run test:cov
```

## 🔗 重要链接

- **API 文档**: http://localhost:3000/api/docs
- **健康检查**: http://localhost:3000/health
- **就绪检查**: http://localhost:3000/ready
- **前端界面**: http://localhost:5173

## 🆘 获取帮助

1. **文档问题**: 查看 [README.md](./README.md) 的文档导航部分
2. **开发问题**: 查看 [QUICKSTART.md](../../QUICKSTART.md) 的快速启动指南
3. **规范问题**: 查看 [CODE_STYLE_GUIDE.md](../../CODE_STYLE_GUIDE.md)
4. **其他问题**: 联系团队成员或查看相关指南

---

**维护者**: AI Assistant  
**最后更新**: 2026-03-27  
**版本**: v1.0
