# 🚀 快速启动指南 - 简化版

## ⚡ 立即开始（3 步）

### 步骤 1: 检查前置条件

确保以下服务已运行：

```bash
# PostgreSQL (端口 5432)
pg_isready -h localhost -p 5432

# Redis (端口 6379)
redis-cli ping
```

如果未运行，请先启动：
- **PostgreSQL**: 使用 pgAdmin 或系统服务管理器
- **Redis**: `redis-server` 或使用 Windows 服务

---

### 步骤 2: 安装依赖（首次运行）

```bash
cd d:/VsCode/customer-label

# 安装所有依赖
npm install
```

---

### 步骤 3: 启动应用

#### 方式 A: 开发模式（推荐）

```bash
npm run dev
```

**注意**: 如果遇到 TypeScript 加载问题，请使用方式 B。

#### 方式 B: 生产模式（稳定）

```bash
# 1. 编译
npm run build

# 2. 运行
npm start
```

---

## ✅ 验证功能

### 快速测试（自动化）

启动另一个终端，运行验证脚本：

```bash
node quick-verify.cjs
```

预期输出：
```
✅ 健康检查通过
✅ 就绪检查通过
✅ Prometheus 指标采集正常
✅ 用户登录成功
✅ 获取当前用户信息成功
✅ 获取推荐标签列表成功
✅ 获取标签评分统计成功
✅ Swagger 文档可访问

🎉 所有测试通过！系统运行正常！
```

### 手动测试

#### 1. 访问 Swagger API 文档

浏览器打开：http://localhost:3000/api/docs

可见到所有 API 接口和测试按钮。

#### 2. 健康检查

```bash
curl http://localhost:3000/health
```

响应：
```json
{
  "status": "ok",
  "timestamp": "2026-03-26T..."
}
```

#### 3. 用户登录

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

响应包含 `access_token`。

#### 4. 访问受保护 API

```bash
# 替换 YOUR_TOKEN 为实际 Token
curl http://localhost:3000/api/v1/recommendations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔑 默认账号

```
用户名：admin
密码：admin123
角色：admin, user
```

---

## 📊 可用功能清单

### ✅ 已完成（Phase 1 & 2）

1. **用户认证授权** 
   - JWT Token 登录
   - Token 刷新
   - RBAC 权限控制

2. **日志监控**
   - Winston 结构化日志
   - HTTP 请求自动日志
   - Prometheus 监控指标

3. **健康检查**
   - `/health` - 基础检查
   - `/ready` - 就绪检查
   - `/metrics` - Prometheus 指标

4. **业务功能**
   - 标签推荐管理
   - 标签评分系统
   - 用户反馈收集
   - 规则引擎配置

5. **基础设施**
   - PostgreSQL 数据库
   - Redis 缓存
   - Bull 消息队列

---

## 🌐 API 端点一览

### 认证相关
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `POST /api/v1/auth/me` - 获取当前用户

### 推荐相关
- `GET /api/v1/recommendations` - 获取推荐列表
- `GET /api/v1/recommendations/:id` - 获取单个推荐
- `POST /api/v1/recommendations/:id/approve` - 批准推荐
- `POST /api/v1/recommendations/:id/reject` - 拒绝推荐
- `GET /api/v1/recommendations/stats` - 推荐统计

### 评分相关
- `GET /api/v1/scores` - 获取所有评分
- `GET /api/v1/scores/:id` - 获取单个评分
- `PUT /api/v1/scores/:id` - 更新评分
- `GET /api/v1/scores/stats` - 评分统计

### 反馈相关
- `POST /api/v1/feedback/:tagId` - 提交反馈
- `GET /api/v1/feedback/stats` - 反馈统计
- `GET /api/v1/feedback/trend` - 反馈趋势

### 系统相关
- `GET /health` - 健康检查
- `GET /ready` - 就绪检查
- `GET /metrics` - Prometheus 指标

---

## 🐛 常见问题

### Q: 端口被占用

**解决**: 
```bash
# 查找并终止占用 3000 端口的进程
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# 或修改 .env 中的 PORT=3001
```

### Q: 数据库连接失败

**解决**:
1. 确认 PostgreSQL 已启动
2. 创建数据库：`CREATE DATABASE customer_label;`
3. 检查 `.env` 配置是否正确

### Q: Redis 连接失败

**解决**:
1. 启动 Redis: `redis-server`
2. 测试连接：`redis-cli ping`（应返回 PONG）
3. 检查 `.env` 中的 REDIS_HOST 和 REDIS_PORT

### Q: TypeScript 编译错误

**解决**:
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 重新编译
npm run build
```

---

## 📝 下一步

### Phase 3: 核心算法实现

1. **规则引擎** - 基于规则的推荐算法
2. **聚类算法** - K-Means 客户分群  
3. **关联分析** - Apriori/F P-Growth

---

## 📚 完整文档

- [README.md](./README.md) - 项目总览
- [USER_GUIDE.md](./USER_GUIDE.md) - 详细使用指南
- [QUICKSTART.md](./QUICKSTART.md) - 快速启动
- [AUTH_GUIDE.md](./AUTH_GUIDE.md) - 认证指南
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 测试指南

---

**版本**: 1.0.0  
**状态**: Phase 2 完成 ✅  
**最后更新**: 2026-03-26
