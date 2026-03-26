# Git 分支管理与提交规范

## 🌿 分支策略

基于 [Conventional Commits](https://www.conventionalcommits.org/) 的分支管理策略。

### 主要分支

#### `master` - 主分支
- **用途**: 生产环境代码，随时可部署
- **保护**: ✅ 受保护分支，需要 Pull Request 合并
- **来源**: 初始提交和其他稳定版本合并

#### `develop` - 开发分支（推荐创建）
```bash
# 创建开发分支
git checkout -b develop master

# 推送到远程
git push -u origin develop
```

### 功能分支

#### `feature/*` - 新功能分支
```bash
# 从 develop 创建功能分支
git checkout -b feature/auth-module develop

# 开发完成后合并回 develop
git checkout develop
git merge feature/auth-module
```

**命名规范**:
- `feature/auth-module` - 认证模块
- `feature/recommendation-engine` - 推荐引擎
- `feature/redis-cache` - Redis 缓存

#### `fix/*` - 修复分支
```bash
# 修复 bug
git checkout -b fix/login-issue develop
```

#### `release/*` - 发布分支
```bash
# 准备新版本发布
git checkout -b release/v1.0.0 develop
```

---

## 📝 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: add JWT authentication` |
| `fix` | Bug 修复 | `fix: resolve login token expiration issue` |
| `docs` | 文档更新 | `docs: update API documentation` |
| `style` | 代码格式 | `style: format code with prettier` |
| `refactor` | 重构 | `refactor: extract cache logic to service` |
| `test` | 测试相关 | `test: add unit tests for auth service` |
| `chore` | 构建/工具 | `chore: update dependencies` |
| `perf` | 性能优化 | `perf: improve query performance` |
| `ci` | CI 配置 | `ci: add GitHub Actions workflow` |

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**示例**:
```
feat(auth): add JWT token authentication

- Implement JwtStrategy and LocalStrategy
- Add AuthService with login and refresh methods
- Create AuthController with login endpoint
- Add RBAC authorization guards

Closes #123
```

### 常用 Scope

- `auth` - 认证授权
- `recommendation` - 推荐模块
- `scoring` - 评分模块
- `feedback` - 反馈模块
- `redis` - Redis 缓存
- `queue` - 消息队列
- `database` - 数据库迁移
- `api` - API 接口
- `docs` - 文档
- `config` - 配置文件

---

## 🔄 工作流程

### 标准开发流程

1. **从 develop 创建功能分支**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature develop
   ```

2. **开发和提交**
   ```bash
   git add .
   git commit -m "feat(my-feature): add new functionality"
   ```

3. **同步 develop 分支**
   ```bash
   git checkout develop
   git pull origin develop
   ```

4. **合并到 develop**
   ```bash
   git checkout feature/my-feature
   git rebase develop
   git checkout develop
   git merge feature/my-feature
   git push origin develop
   ```

### 发布流程

1. **创建发布分支**
   ```bash
   git checkout -b release/v1.0.0 develop
   ```

2. **最终测试和修复**
   ```bash
   git commit -m "fix: critical bug fixes for release"
   ```

3. **合并到 master 和 develop**
   ```bash
   # 合并到 master
   git checkout master
   git merge release/v1.0.0
   git tag v1.0.0
   git push origin master --tags

   # 合并回 develop
   git checkout develop
   git merge release/v1.0.0
   git push origin develop

   # 删除发布分支
   git branch -d release/v1.0.0
   ```

---

## 🏷️ 标签管理

### 创建标签

```bash
# 轻量标签
git tag v1.0.0

# 附注标签（推荐）
git tag -a v1.0.0 -m "Release version 1.0.0"
```

### 推送标签

```bash
# 推送单个标签
git push origin v1.0.0

# 推送所有标签
git push origin --tags
```

### 查看标签

```bash
# 列出所有标签
git tag

# 查看标签详情
git show v1.0.0
```

---

## 🔍 常用命令

### 查看状态和日志

```bash
# 查看当前状态
git status

# 查看提交历史
git log --oneline

# 查看图形化历史
git log --graph --oneline --all

# 查看文件变更
git diff HEAD
```

### 撤销操作

```bash
# 撤销工作区修改
git checkout -- <file>

# 撤销暂存区修改
git reset HEAD <file>

# 撤销最后一次提交（保留修改）
git reset --soft HEAD~1

# 撤销最后一次提交（丢弃修改）
git reset --hard HEAD~1
```

### 分支操作

```bash
# 列出所有本地分支
git branch

# 列出所有远程分支
git branch -r

# 列出所有分支（本地 + 远程）
git branch -a

# 删除本地分支
git branch -d <branch-name>

# 删除远程分支
git push origin --delete <branch-name>
```

---

## 🛡️ 最佳实践

### 1. 频繁提交

```bash
# ✅ 推荐：小步快跑
git commit -m "feat: add user login endpoint"
git commit -m "feat: add token refresh logic"

# ❌ 避免：一次性提交大量代码
git commit -m "add everything"
```

### 2. 清晰的提交信息

```bash
# ✅ 推荐：具体描述
git commit -m "feat(auth): implement JWT token generation and validation"

# ❌ 避免：模糊描述
git commit -m "update code"
git commit -m "fix stuff"
```

### 3. 及时同步主干

```bash
# 每天同步 develop 分支
git checkout develop
git pull origin develop

# 在功能分支中合并或变基
git checkout feature/my-feature
git merge develop  # 或 git rebase develop
```

### 4. 代码审查后再合并

```bash
# ✅ 推荐：使用 Pull Request
# 1. 推送到远程分支
git push origin feature/my-feature
# 2. 在 GitHub/GitLab 创建 PR
# 3. 等待团队审查
# 4. 合并到 develop

# ❌ 避免：直接推送到 master
git checkout master
git push origin master  # 危险！
```

---

## 📦 远程仓库配置

### 添加远程仓库

```bash
# 添加 GitHub 远程
git remote add origin git@github.com:username/customer-label.git

# 添加 GitLab 远程
git remote add origin git@gitlab.com:username/customer-label.git

# 查看远程
git remote -v
```

### 推送代码

```bash
# 首次推送
git push -u origin master

# 后续推送
git push

# 推送特定分支
git push origin develop
```

### 拉取代码

```bash
# 拉取并合并
git pull

# 拉取并变基
git pull --rebase
```

---

## 🚨 故障排查

### 问题 1: 提交冲突

```bash
# 解决冲突后标记为已解决
git add <resolved-file>

# 继续变基
git rebase --continue

# 或取消变基
git rebase --abort
```

### 问题 2: 误删分支

```bash
# 查看 reflog
git reflog

# 恢复分支
git checkout -b recovered-branch <commit-hash>
```

### 问题 3: 大文件误提交

```bash
# 使用 BFG Repo-Cleaner
java -jar bfg.jar --strip-blobs-bigger-than 10M .

# 或使用 git filter-branch
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch path/to/file' \
  --prune-empty --tag-name-filter cat -- --all
```

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26
