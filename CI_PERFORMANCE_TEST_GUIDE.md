# CI/CD 性能测试配置指南

## 概述

为了提高日常开发效率，避免性能基准测试阻塞 PR 合并流程，我们采用了按需运行的性能测试策略。

## 默认行为

### 常规 CI 流程（默认）
- 触发条件：push 到 master/develop 分支，pull_request 到 master/develop 分支
- 测试范围：所有单元测试、集成测试（排除 e2e 和 auth）、跳过性能基准测试
- 运行时间：约 2-3 分钟

## 手动触发完整测试

### GitHub Actions UI
1. 访问 GitHub 仓库的 Actions 标签页
2. 选择 Test & Coverage 工作流
3. 点击 Run workflow 按钮
4. 设置 performance_tests: true
5. 点击 Run workflow

### GitHub CLI
```bash
gh workflow run test.yml --ref develop --field performance_tests=true
```

## 环境变量控制

本地运行完整测试：
```bash
PERFORMANCE_TESTS=true npm test
```

## 最佳实践

| 场景 | 性能测试 | 运行时间 | 适用情况 |
|------|---------|---------|---------|
| 日常开发 | 跳过 | 2-3 分钟 | PR 检查、日常提交 |
| 手动触发 | 运行 | 8-10 分钟 | 发布前验证、性能调优 |
| 定时任务 | 运行 | 8-10 分钟 | 每周性能监控 |

核心原则：在不影响开发效率的前提下，确保关键节点的性能验证。
