# 客户标签智能推荐系统 - 快速启动指南

## 🚀 快速开始

### 1. 环境准备

确保已安装以下服务：
- ✅ Node.js 18+ 
- ✅ PostgreSQL 15+
- ✅ Redis 7+

### 2. 安装依赖

```bash
cd d:\VsCode\customer-label
npm install
```

### 3. 配置环境变量

编辑 `.env` 文件（已创建）：

```env
# 应用配置
PORT=3000
API_PREFIX=/api/v1
NODE_ENV=development

# PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=customer_label

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 4. 数据库迁移

```bash
# 运行迁移脚本创建表
npm run migration:run
```

### 5. 启动应用

#### 开发模式（支持热重载）

```bash
npm run dev
```

#### 生产模式

```bash
# 编译 TypeScript
npm run build

# 启动应用
npm start
```

---

## 📡 API 端点

### 推荐模块 (`/api/v1/recommendations`)

#### 获取客户推荐列表
```http
GET /api/v1/recommendations/customer/:customerId
```

**响应示例**:
```json
[
  {
    "id": 1,
    "customerId": 1001,
    "tagName": "高价值客户",
    "tagCategory": "value",
    "confidence": 0.95,
    "source": "rule",
    "reason": "月消费金额 15000 元",
    "isAccepted": true,
    "createdAt": "2026-03-26T12:00:00Z"
  }
]
```

#### 生成推荐（异步）
```http
POST /api/v1/recommendations/generate/:customerId?mode=all&useCache=true
```

**参数**:
- `mode`: `rule` | `clustering` | `association` | `all`（默认）
- `useCache`: `true` | `false`（默认 true）

**响应示例**:
```json
{
  "status": "queued",
  "message": "推荐计算任务已加入队列，稍后查看结果"
}
```

#### 批量生成推荐
```http
POST /api/v1/recommendations/batch-generate
```

**请求体**:
```json
{
  "customerIds": [1001, 1002, 1003]
}
```

#### 获取推荐统计
```http
GET /api/v1/recommendations/stats
```

**响应示例**:
```json
{
  "total": 150,
  "bySource": {
    "rule": 80,
    "clustering": 50,
    "association": 20
  },
  "avgConfidence": 0.85
}
```

#### 获取活跃规则
```http
GET /api/v1/recommendations/rules/active
```

#### 获取聚类配置
```http
GET /api/v1/recommendations/configs/clustering
```

---

### 评分模块 (`/api/v1/scores`)

#### 获取标签评分
```http
GET /api/v1/scores/:tagId
```

#### 获取所有标签评分
```http
GET /api/v1/scores
```

#### 更新标签评分
```http
POST /api/v1/scores
```

**请求体示例**:
```json
{
  "tagId": 1,
  "tagName": "高价值客户",
  "coverageScore": 0.855,
  "coverageValue": 0.125,
  "discriminationScore": 0.882,
  "discriminationIv": 0.35,
  "stabilityScore": 0.921,
  "stabilityPsi": 0.08,
  "businessValueScore": 0.95,
  "businessValueRoi": 2.5
}
```

#### 批量更新评分
```http
POST /api/v1/scores/batch
```

#### 按推荐等级查询
```http
GET /api/v1/scores/recommendation/:level
```

**level 可选值**: `强烈推荐`, `推荐`, `中性`, `不推荐`, `禁用`

#### 获取评分统计
```http
GET /api/v1/scores/stats/overview
```

---

### 反馈模块 (`/api/v1/feedback`)

#### 记录每日反馈
```http
POST /api/v1/feedback/daily
```

**请求体示例**:
```json
{
  "date": "2026-03-26",
  "totalRecommendations": 150,
  "acceptedCount": 95
}
```

#### 获取指定日期反馈
```http
GET /api/v1/feedback/:date
```

#### 获取最近 N 天反馈
```http
GET /api/v1/feedback/recent/days?days=30
```

#### 获取平均采纳率
```http
GET /api/v1/feedback/stats/avg-acceptance-rate?days=30
```

#### 获取反馈趋势
```http
GET /api/v1/feedback/stats/trend?days=30
```

**响应示例**:
```json
{
  "dates": ["2026-03-01", "2026-03-02", ...],
  "rates": [0.63, 0.65, ...],
  "totals": [150, 165, ...]
}
```

#### 获取统计摘要
```http
GET /api/v1/feedback/stats/summary
```

---

## 🧪 测试数据

系统已包含模拟测试数据，可以直接使用：

### 数据库测试数据
- **推荐规则**: 3 条（高价值/活跃/流失风险识别）
- **聚类配置**: 1 条（k-means 算法）
- **标签评分**: 3 条（高价值/活跃/流失风险）
- **标签推荐**: 5 条（不同客户的推荐结果）
- **反馈统计**: 5 条（最近 5 天的统计数据）

### 测试客户 ID
- `1001` - 高价值客户 + 活跃客户
- `1002` - 流失风险客户
- `1003` - 新客户
- `1004` - 高价值客户（未采纳）
- `1005` - 价格敏感客户

---

## 🔍 常用测试命令

### 1. 测试推荐 API
```bash
# 获取客户 1001 的推荐
curl http://localhost:3000/api/v1/recommendations/customer/1001

# 为客户 1001 生成新推荐
curl -X POST http://localhost:3000/api/v1/recommendations/generate/1001

# 批量生成推荐
curl -X POST http://localhost:3000/api/v1/recommendations/batch-generate \
  -H "Content-Type: application/json" \
  -d '{"customerIds": [1001, 1002, 1003]}'

# 获取推荐统计
curl http://localhost:3000/api/v1/recommendations/stats
```

### 2. 测试评分 API
```bash
# 获取标签 1 的评分
curl http://localhost:3000/api/v1/scores/1

# 获取所有评分
curl http://localhost:3000/api/v1/scores

# 获取"强烈推荐"的标签
curl http://localhost:3000/api/v1/scores/recommendation/强烈推荐

# 获取评分统计
curl http://localhost:3000/api/v1/scores/stats/overview
```

### 3. 测试反馈 API
```bash
# 获取最近 7 天的反馈
curl "http://localhost:3000/api/v1/feedback/recent/days?days=7"

# 获取平均采纳率
curl "http://localhost:3000/api/v1/feedback/stats/avg-acceptance-rate?days=30"

# 获取反馈趋势
curl "http://localhost:3000/api/v1/feedback/stats/trend?days=30"

# 获取统计摘要
curl http://localhost:3000/api/v1/feedback/stats/summary
```

---

## 🛠️ 故障排查

### 问题 1: 数据库连接失败

**错误信息**: `Error: connect ECONNREFUSED`

**解决方案**:
1. 确认 PostgreSQL 服务已启动
2. 检查 `.env` 中的数据库配置
3. 确认数据库 `customer_label` 已创建

### 问题 2: Redis 连接失败

**错误信息**: `Redis error: connect ECONNREFUSED`

**解决方案**:
1. 确认 Redis 服务已启动
2. 检查 `.env` 中的 Redis 配置
3. 测试 Redis 连接：`redis-cli ping`

### 问题 3: 端口被占用

**错误信息**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决方案**:
```bash
# Windows: 查找占用端口的进程
netstat -ano | findstr :3000

# 杀死进程（替换 PID）
taskkill /PID <PID> /F

# 或者修改 .env 中的 PORT
PORT=3001
```

### 问题 4: TypeScript 编译错误

**解决方案**:
```bash
# 清理并重新编译
rm -rf dist
npm run build

# 检查 TypeScript 配置
cat tsconfig.json
```

---

## 📊 监控和日志

### 应用日志

启动后可在控制台查看日志：

```
[Nest] XXXXX  - MM/DD/YYYY, HH:MM:SS AM     LOG [NestApplication] Nest application successfully started
[Nest] XXXXX  - MM/DD/YYYY, HH:MM:SS AM     LOG [Bootstrap] 🚀 Application started successfully!
[Nest] XXXXX  - MM/DD/YYYY, HH:MM:SS AM     LOG [Bootstrap] 📍 API Prefix: /api/v1
```

### 队列监控

查看推荐队列状态：
```typescript
// 在代码中调用
const stats = await recommendationQueue.getStats();
console.log(stats);
```

### 缓存监控

查看 Redis 缓存状态：
```typescript
// 通过 CacheService
const cacheStats = await cacheService.getStats();
console.log(cacheStats);
```

---

## 🎯 下一步

1. **测试 API**: 使用 curl 或 Postman 测试所有端点
2. **查看日志**: 观察应用运行日志，确认无错误
3. **验证功能**: 测试推荐、评分、反馈三大模块
4. **性能优化**: 根据实际需求调整缓存策略和队列配置

---

## 📚 相关文档

- [数据库设计文档](./src/database/README.md)
- [实体文档](./src/entities.md)
- [Redis 使用指南](./src/infrastructure/redis/README.md)
- [消息队列指南](./src/infrastructure/queue/README.md)

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26
