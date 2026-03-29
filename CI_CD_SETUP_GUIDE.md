# GitHub Actions CI/CD 配置与验证指南

**创建时间**: 2026-03-30 07:30  
**状态**: ⏳ 等待网络恢复后执行推送  

---

## ✅ 已完成的前置准备

### 1. 远程仓库配置 ✅
```bash
origin  https://github.com/shengqb0926/customer-label.git (fetch)
origin  https://github.com/shengqb0926/customer-label.git (push)
```

### 2. Git 提交记录 ✅
最近 5 次提交：
- `a4c6fcc` - docs: 添加工作交接文档，准备明日继续冲刺
- `e942ce1` - test: 大幅提升覆盖率至 36.76%，Branches 突破 30%
- `be44925` - test: 修复 Rule Engine Controller 和集成测试，覆盖率提升至 36.76%
- `24f3d19` - test: 修复 Association Engine 测试并稳定覆盖率至 36.07%
- `da1cb5a` - test: 大幅提升覆盖率至 36.12%，验证多个核心服务

### 3. CI/CD 配置文件 ✅
GitHub Actions 工作流已配置完成：
- **文件路径**: `.github/workflows/test.yml`
- **触发条件**: push/pull_request 到 master/develop 分支
- **测试矩阵**: Node.js 18.x 和 20.x
- **依赖服务**: PostgreSQL 15, Redis 7
- **覆盖率门禁**: 30% 最低要求
- **Codecov 集成**: 已配置（需要 Token）

---

## 🚀 推送步骤（网络恢复后执行）

### 步骤 1: 推送到 GitHub
```bash
cd d:/VsCode/customer-label
git push origin master
```

**预期输出**:
```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
Delta compression using up to X threads
Compressing objects: 100% (XX/XX), done.
Writing objects: 100% (XX/XX), XXX KiB | XX MiB/s, done.
Total XX (delta XX), reused XX (delta XX), pack-reused X
remote: Resolving deltas: 100% (XX/XX)
To https://github.com/shengqb0926/customer-label.git
   XXXXXXX..a4c6fcc  master -> master
```

### 步骤 2: 验证 GitHub Actions 工作流

#### 方式 A: 通过浏览器访问
1. 打开：https://github.com/shengqb0926/customer-label/actions
2. 查看最新的 workflow run（应该显示 "Test & Coverage"）
3. 点击查看详情，确认以下步骤：
   - ✅ Run lint
   - ✅ Run unit tests with coverage
   - ✅ Check coverage thresholds
   - ✅ Upload coverage to GitHub Actions
   - ✅ Upload coverage to Codecov

#### 方式 B: 通过 GitHub CLI（可选）
```bash
gh workflow list
gh run list --workflow "Test & Coverage"
gh run view --log
```

### 步骤 3: 检查覆盖率报告

#### 在 GitHub Actions 中查看
1. 进入最新的 workflow run
2. 点击 "Run unit tests with coverage" 步骤
3. 查看控制台输出中的覆盖率摘要：
```
=============================== Coverage summary ===============================
Statements   : 36.76% ( XXXX/XXXX )
Branches     : 30.51% ( XXX/XXX )
Functions    : 29.43% ( XXX/XXX )
Lines        : 36.40% ( XXXX/XXXX )
================================================================================
```

#### 下载覆盖率报告
```bash
# 在 GitHub Actions 页面下载 artifacts
# 文件名：coverage-report-20.x.zip
```

### 步骤 4: 配置 Codecov（可选但推荐）

#### 获取 Codecov Token
1. 访问：https://app.codecov.io/
2. 登录 GitHub 账号
3. 找到 `customer-label` 仓库
4. 复制 Settings → General → Repository Upload Token

#### 设置 GitHub Secret
1. 访问：https://github.com/shengqb0926/customer-label/settings/secrets/actions
2. 点击 "New repository secret"
3. 添加：
   - **Name**: `CODECOV_TOKEN`
   - **Value**: [粘贴刚才复制的 Token]
4. 保存

#### 验证 Codecov 集成
1. 重新推送一次代码以触发新的 workflow
2. 在 Codecov dashboard 查看是否收到报告
3. 确认 PR 评论功能是否正常（如果有 pull request）

---

## 🔧 故障排查指南

### 问题 1: 网络连接失败（当前遇到）
**现象**: `Recv failure: Connection was reset`

**解决方案**:
1. **稍后重试** - 可能是临时网络波动
2. **使用代理**（如有）:
   ```bash
   git config --global http.proxy http://proxy.example.com:8080
   git config --global https.proxy https://proxy.example.com:8080
   ```
3. **切换到 SSH**（推荐）:
   ```bash
   # 生成 SSH key（如果没有）
   ssh-keygen -t ed25519 -C "your_email@example.com"
   
   # 添加公钥到 GitHub
   cat ~/.ssh/id_ed25519.pub
   
   # 更改远程 URL
   git remote set-url origin git@github.com:shengqb0926/customer-label.git
   
   # 测试连接
   ssh -T git@github.com
   
   # 推送
   git push origin master
   ```

### 问题 2: GitHub Actions 失败 - 覆盖率低于 30%
**现象**: Workflow 在 "Check coverage thresholds" 步骤失败

**解决方案**:
```yaml
# 临时降低阈值（不推荐）或提升覆盖率
# 修改 .github/workflows/test.yml 第 50 行
if (( $(echo "$COVERAGE < 30" | bc -l) )); then
# 改为
if (( $(echo "$COVERAGE < 25" | bc -l) )); then
```

**推荐做法**: 继续编写测试提升覆盖率到 30%+

### 问题 3: Codecov 上传失败
**现象**: `Upload coverage to Codecov` 步骤显示警告或失败

**常见原因**:
- 缺少 CODECOV_TOKEN
- 网络超时
- 文件格式不正确

**解决方案**:
```yaml
# 如果不需要 Codecov，可以禁用此步骤
# 在 test.yml 中找到这行并注释掉：
# - name: Upload coverage to Codecov (optional)
#   uses: codecov/codecov-action@v3
#   ...
```

### 问题 4: E2E 测试失败
**现象**: `e2e-test` job 失败

**可能原因**:
- PostgreSQL 连接问题
- 数据库 schema 不存在
- 环境变量配置错误

**调试步骤**:
```bash
# 本地模拟 CI 环境运行
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
export DATABASE_USER=test
export DATABASE_PASSWORD=test
export DATABASE_NAME=test_db
export REDIS_HOST=localhost
export REDIS_PORT=6379

npm run test:e2e
```

---

## 📊 CI/CD 流水线说明

### Job 执行顺序
```
test (Node 18.x, 20.x)
  ↓
e2e-test (需要 test 成功)
  ↓
build (需要 test 成功)
```

### 关键配置参数

#### 测试 Job
- **操作系统**: Ubuntu-latest
- **Node 版本**: 18.x 和 20.x（并行）
- **服务依赖**: Redis 7
- **缓存策略**: npm cache（基于 package-lock.json）

#### 覆盖率检查
- **最低要求**: 30% Statements
- **报告格式**: JSON + LCOV
- **上传产物**: coverage/ 目录

#### E2E 测试
- **数据库**: PostgreSQL 15
- **Schema**: test
- **隔离策略**: 每个 matrix 独立实例

---

## 🎯 验证清单

### 推送后立即检查
- [ ] Git push 成功，无错误信息
- [ ] GitHub 仓库显示最新 commit
- [ ] Actions 页面出现新的 workflow run

### Workflow 运行时检查
- [ ] "Test & Coverage" workflow 开始运行（黄色圆圈）
- [ ] test job 在 Node 18.x 和 20.x 上同时运行
- [ ] 所有步骤显示绿色勾号（✅）

### Workflow 完成后检查
- [ ] 总耗时合理（预计 5-10 分钟）
- [ ] 覆盖率 > 30%（当前 36.76%）
- [ ] Artifacts 上传成功
- [ ] Codecov 报告收到（如已配置）

### 长期监控
- [ ] 每次 push 都自动触发 workflow
- [ ] Pull request 自动运行测试
- [ ] 覆盖率趋势稳定或上升
- [ ] 构建时间无明显增长

---

## 🔗 重要链接

### 项目相关
- **GitHub 仓库**: https://github.com/shengqb0926/customer-label
- **Actions 页面**: https://github.com/shengqb0926/customer-label/actions
- **Settings → Secrets**: https://github.com/shengqb0926/customer-label/settings/secrets/actions

### 外部资源
- **GitHub Actions 文档**: https://docs.github.com/en/actions
- **Codecov 官方文档**: https://docs.codecov.com/
- **Jest 覆盖率**: https://jestjs.io/docs/cli#--coverage

---

## 💡 下一步行动建议

### 立即执行（网络恢复后）
1. ✅ 推送到 GitHub
2. ✅ 验证 Actions 运行状态
3. ✅ 检查覆盖率报告
4. ✅ 配置 Codecov Token（可选）

### 后续优化
1. 添加 Slack/Discord 通知集成
2. 配置自动发布（Release）流程
3. 添加性能基准测试 job
4. 设置覆盖率趋势图表

---

**当前状态**: ⏳ 等待网络恢复  
**下次尝试时间**: 建议 10-15 分钟后重试  
**备选方案**: 使用 SSH 方式推送（更稳定）
