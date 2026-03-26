# 🚀 客户标签智能推荐系统 - 完整使用指南

## 📋 目录

1. [快速启动](#快速启动)
2. [功能验证](#功能验证)
3. [API 测试](#api-测试)
4. [监控与日志](#监控与日志)
5. [常见问题](#常见问题)

---

## 🎯 快速启动

### 前置条件检查

确保以下服务已启动：

```bash
# 1. PostgreSQL 数据库（端口 5432）
# 2. Redis 缓存（端口 6379）
```

### 启动步骤

#### 方式一：开发模式（推荐用于调试）

```bash
# 进入项目目录
cd d:/VsCode/customer-label

# 启动开发服务器（支持热重载）
npm run dev
```

#### 方式二：生产模式（需要先编译）

```bash
# 1. 编译 TypeScript
npm run build

# 2. 启动生产服务器
npm start
```

#### 方式三：一键启动脚本（Windows）

创建 `start.bat` 文件：

```batch
@echo off
echo ========================================
echo 客户标签智能推荐系统 - 启动中...
echo ========================================
echo.

echo [1/3] 检查 PostgreSQL...
pg_isready -h localhost -p 5432
if %ERRORLEVEL% NEQ 0 (
    echo ❌ PostgreSQL 未启动，请先启动数据库！
    pause
    exit /b 1
)
echo ✅ PostgreSQL 已就绪

echo.
echo [2/3] 检查 Redis...
redis-cli ping
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Redis 未启动，请先启动缓存服务！
    pause
    exit /b 1
)
echo ✅ Redis 已就绪

echo.
echo [3/3] 启动应用服务器...
npm run dev
```

---

## 🔍 功能验证

### 1. 访问 Swagger API 文档

启动应用后，打开浏览器访问：

```
http://localhost:3000/api/docs
```

**可看到的功能**:
- ✅ 认证接口（登录、刷新 Token）
- ✅ 推荐接口（标签推荐、规则管理）
- ✅ 评分接口（标签评分、统计）
- ✅ 反馈接口（用户反馈收集）
- ✅ 健康检查接口

### 2. 健康检查

```bash
# 基础健康检查
curl http://localhost:3000/health

# 预期输出:
# {"status":"ok","timestamp":"2026-03-26T..."}

# 就绪检查
curl http://localhost:3000/ready

# Prometheus 指标
curl http://localhost:3000/metrics
```

### 3. 用户登录测试

```bash
# 使用默认管理员账号登录
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"

# 预期输出:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "expires_in": 3600,
#   "token_type": "Bearer",
#   "user": {
#     "id": 1,
#     "username": "admin",
#     "email": "admin@example.com",
#     "roles": ["admin", "user"]
#   }
# }
```

### 4. 访问受保护的 API

```bash
# 保存 Token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 获取当前用户信息
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 获取推荐标签列表
curl http://localhost:3000/api/v1/recommendations \
  -H "Authorization: Bearer $TOKEN"

# 获取标签评分统计
curl http://localhost:3000/api/v1/scores/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🧪 API 测试示例

### 认证相关

#### 用户登录
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

#### 刷新 Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Authorization: Bearer $TOKEN"
```

#### 获取当前用户
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 推荐相关

#### 获取所有推荐标签
```bash
curl http://localhost:3000/api/v1/recommendations \
  -H "Authorization: Bearer $TOKEN"
```

#### 获取特定状态的推荐
```bash
# 状态：pending, approved, rejected
curl http://localhost:3000/api/v1/recommendations?status=pending \
  -H "Authorization: Bearer $TOKEN"
```

#### 获取推荐统计
```bash
curl http://localhost:3000/api/v1/recommendations/stats \
  -H "Authorization: Bearer $TOKEN"
```

#### 批准推荐
```bash
curl -X POST http://localhost:3000/api/v1/recommendations/1/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reason\":\"高价值标签，值得推荐\"}"
```

### 评分相关

#### 获取标签评分
```bash
curl http://localhost:3000/api/v1/scores/1 \
  -H "Authorization: Bearer $TOKEN"
```

#### 更新标签评分
```bash
curl -X PUT http://localhost:3000/api/v1/scores/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"coverageScore\": 0.85,
    \"discriminationScore\": 0.78,
    \"stabilityScore\": 0.92,
    \"businessValueScore\": 0.88,
    \"recommendation\": \"强烈推荐\"
  }"
```

#### 获取所有评分
```bash
curl http://localhost:3000/api/v1/scores \
  -H "Authorization: Bearer $TOKEN"
```

#### 获取评分统计
```bash
curl http://localhost:3000/api/v1/scores/stats \
  -H "Authorization: Bearer $TOKEN"
```

### 反馈相关

#### 提交用户反馈
```bash
curl -X POST http://localhost:3000/api/v1/feedback/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"feedbackType\": \"like\",
    \"comment\": \"标签推荐很准确\"
  }"
```

#### 获取反馈统计
```bash
# 获取指定日期的统计
curl "http://localhost:3000/api/v1/feedback/stats?date=2026-03-26" \
  -H "Authorization: Bearer $TOKEN"

# 获取趋势数据（最近 7 天）
curl "http://localhost:3000/api/v1/feedback/trend?days=7" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 监控与日志

### 查看实时日志

```bash
# 查看所有日志（控制台输出）
npm run dev

# 查看应用日志文件
tail -f logs/application-*.log

# 查看错误日志
tail -f logs/error-*.log

# 查看 HTTP 请求日志
tail -f logs/http-*.log
```

### Prometheus 监控

访问监控指标：

```bash
curl http://localhost:3000/metrics

# 输出示例:
# HELP nodejs_eventloop_lag_seconds Event loop lag
# TYPE nodejs_eventloop_lag_seconds gauge
# nodejs_eventloop_lag_seconds 0.012
# ...
```

### Grafana 集成（可选）

1. 安装 Grafana
2. 添加 Prometheus 数据源（http://localhost:9090）
3. 导入 Node.js 应用监控面板

---

## 🔧 常见问题

### Q1: 端口已被占用

**错误**: `EADDRINUSE: address already in use :::3000`

**解决方案**:

```bash
# Windows: 查找占用端口的进程
netstat -ano | findstr :3000

# 终止进程（替换 PID）
taskkill /PID <PID> /F

# 或修改端口（在 .env 中）
PORT=3001
```

### Q2: 数据库连接失败

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**解决方案**:

```bash
# 检查 PostgreSQL 是否运行
pg_isready -h localhost -p 5432

# Windows 服务重启
net stop postgresql-x64-15
net start postgresql-x64-15

# 或使用 pgAdmin 启动服务
```

### Q3: Redis 连接失败

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**解决方案**:

```bash
# Windows: 检查 Redis 服务
redis-cli ping

# 如果返回错误，启动 Redis 服务
# 方式 1: 使用服务管理器
# 方式 2: 命令行启动
redis-server

# 验证连接
redis-cli ping  # 应返回 PONG
```

### Q4: TypeScript 编译错误

**错误**: `Cannot find module '@nestjs/common'`

**解决方案**:

```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 清理并重新编译
npm run build
```

### Q5: 迁移执行失败

**错误**: `error database "customer_label" does not exist`

**解决方案**:

```bash
# 1. 手动创建数据库
psql -U postgres
CREATE DATABASE customer_label;
\q

# 2. 运行迁移
npm run migration:run

# 3. 验证表结构
psql -U postgres -d customer_label
\dt  # 列出所有表
```

### Q6: JWT Token 过期

**错误**: `UnauthorizedException: Jwt token is expired`

**解决方案**:

```bash
# 重新登录获取新 Token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"

# 或使用刷新接口
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Authorization: Bearer $OLD_TOKEN"
```

### Q7: 权限不足

**错误**: `ForbiddenException: You do not have permission`

**解决方案**:

```bash
# 检查当前用户的角色
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 某些接口需要 admin 角色
# 请使用 admin 账号登录
# username: admin
# password: admin123
```

---

## 📝 测试数据准备

如果想快速测试系统功能，可以插入一些测试数据：

```sql
-- 连接到数据库
psql -U postgres -d customer_label

-- 插入测试用户（密码：admin123）
INSERT INTO users (username, email, password_hash, roles, created_at)
VALUES ('admin', 'admin@example.com', '$2b$10$...', ARRAY['admin', 'user'], NOW())
ON CONFLICT (username) DO NOTHING;

-- 插入测试标签评分
INSERT INTO tag_scores (tag_id, tag_name, overall_score, recommendation, created_at, updated_at)
VALUES 
  (1, '高价值客户', 85.5, '强烈推荐', NOW(), NOW()),
  (2, '潜力客户', 72.3, '推荐', NOW(), NOW()),
  (3, '一般客户', 65.0, '中性', NOW(), NOW())
ON CONFLICT (tag_id) DO NOTHING;
```

---

## 🎯 下一步建议

### 已完成功能 ✅

1. **用户认证授权** - JWT + RBAC
2. **日志监控** - Winston + Prometheus
3. **单元测试** - Jest 测试框架
4. **数据库设计** - TypeORM +  migrations
5. **Redis 缓存** - CacheService
6. **消息队列** - Bull Queue
7. **业务模块** - Recommendation, Scoring, Feedback

### 待实现功能 ⏳

1. **规则引擎** - 基于规则的推荐算法
2. **聚类算法** - K-Means 客户分群
3. **关联分析** - Apriori/F P-Growth
4. **性能优化** - 查询优化、缓存策略
5. **E2E 测试** - 端到端集成测试

---

## 📚 相关文档

- [项目 README](./README.md)
- [快速启动指南](./QUICKSTART.md)
- [认证使用指南](./AUTH_GUIDE.md)
- [测试使用指南](./TESTING_GUIDE.md)
- [项目结构说明](./PROJECT_STRUCTURE.md)

---

**版本**: 1.0.0  
**最后更新**: 2026-03-26  
**状态**: Phase 2 完成（生产就绪）
