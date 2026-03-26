# 客户标签智能推荐系统

基于 NestJS + PostgreSQL + Redis 的智能客户标签推荐系统。

## 🚀 技术栈

- **后端框架**: NestJS 10
- **数据库**: PostgreSQL 15+
- **缓存**: Redis 7+
- **消息队列**: Bull (基于 Redis)
- **认证**: JWT + Passport
- **日志**: Winston
- **监控**: Prometheus
- **文档**: Swagger/OpenAPI

## 📦 快速开始

### 1. 环境要求

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

### 4. 数据库初始化

```bash
# 运行数据库迁移
npm run migration:run
```

### 5. 启动应用

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 📡 API 端点

### 认证接口
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `POST /api/v1/auth/me` - 获取当前用户

### 推荐接口
- `GET /api/v1/recommendations/customer/:id` - 获取客户推荐
- `POST /api/v1/recommendations/generate/:id` - 生成推荐
- `POST /api/v1/recommendations/batch-generate` - 批量生成
- `GET /api/v1/recommendations/stats` - 推荐统计

### 评分接口
- `GET /api/v1/scores/:tagId` - 获取标签评分
- `GET /api/v1/scores` - 获取所有评分
- `POST /api/v1/scores` - 更新评分
- `GET /api/v1/scores/stats/overview` - 评分统计

### 反馈接口
- `POST /api/v1/feedback/daily` - 记录每日反馈
- `GET /api/v1/feedback/recent/days` - 最近 N 天反馈
- `GET /api/v1/feedback/stats/trend` - 反馈趋势
- `GET /api/v1/feedback/stats/summary` - 统计摘要

### 健康检查
- `GET /health` - 健康检查
- `GET /ready` - 就绪检查
- `GET /metrics` - Prometheus 指标

## 📚 文档

- [快速启动指南](./QUICKSTART.md)
- [项目结构](./PROJECT_STRUCTURE.md)
- [认证授权指南](./AUTH_GUIDE.md)
- [测试数据说明](./TEST_DATA_GUIDE.md)
- [API 文档](http://localhost:3000/api/docs)

## 🧪 测试账户

**管理员账户**:
- Username: `admin`
- Password: `admin123`

**普通用户**:
- Username: `user`
- Password: `user123`

## 📊 项目结构

```
customer-label/
├── src/
│   ├── modules/          # 业务模块
│   │   ├── auth/        # 认证模块
│   │   ├── recommendation/ # 推荐模块
│   │   ├── scoring/     # 评分模块
│   │   └── feedback/    # 反馈模块
│   ├── infrastructure/   # 基础设施
│   │   ├── redis/       # Redis 缓存
│   │   └── queue/       # 消息队列
│   ├── common/          # 公共功能
│   │   ├── logger/      # 日志
│   │   ├── metrics/     # 监控指标
│   │   └── guards/      # 守卫
│   └── database/        # 数据库迁移
├── openspec/            # OpenSpec 规范
├── logs/                # 日志文件
└── docs/                # 文档
```

## 🔧 开发命令

```bash
# 编译 TypeScript
npm run build

# 开发模式（热重载）
npm run dev

# 运行数据库迁移
npm run migration:run

# 运行测试
npm test

# 生成测试覆盖率
npm run test:cov
```

## 📈 监控与日志

- **日志目录**: `logs/`
- **健康检查**: `http://localhost:3000/health`
- **Prometheus 指标**: `http://localhost:3000/metrics`
- **Swagger 文档**: `http://localhost:3000/api/docs`

## 🎯 功能特性

- ✅ JWT 认证授权（支持 RBAC 角色权限）
- ✅ Redis 缓存优化
- ✅ Bull 消息队列异步处理
- ✅ Winston 结构化日志
- ✅ Prometheus 监控指标
- ✅ Swagger API 文档
- ✅ TypeORM 数据库迁移
- ✅ RESTful API 设计

## 📝 License

MIT
