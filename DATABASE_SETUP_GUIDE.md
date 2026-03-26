# 数据库安装与迁移执行指南

## 📋 当前状态

### ✅ 已完成的工作

1. **项目配置** ✅
   - ✅ package.json 已创建（包含所有依赖）
   - ✅ tsconfig.json 已创建（TypeScript 配置）
   - ✅ data-source.ts 已创建（TypeORM 数据源配置）
   - ✅ .env 文件已创建（环境变量配置）

2. **数据库迁移文件** ✅
   - ✅ 1711507200000-CreateTagRecommendationsTable.ts
   - ✅ 1711507260000-CreateTagScoresTable.ts
   - ✅ 1711507320000-CreateRecommendationRulesTable.ts
   - ✅ 1711507380000-CreateClusteringConfigsTable.ts
   - ✅ 1711507440000-CreateFeedbackStatisticsTable.ts

3. **TypeORM 实体类** ✅
   - ✅ TagRecommendation 实体
   - ✅ TagScore 实体
   - ✅ RecommendationRule 实体
   - ✅ ClusteringConfig 实体
   - ✅ FeedbackStatistic 实体

4. **Redis 模块** ✅
   - ✅ RedisService 服务类
   - ✅ RedisModule 模块
   - ✅ Redis 配置和索引文件

---

## 🚀 快速开始指南

### 步骤 1: 安装 PostgreSQL

**请选择以下任一方式**:

#### 方式 A: 安装包安装（推荐）

1. 下载 PostgreSQL 15/16: https://www.postgresql.org/download/windows/
2. 运行安装程序
3. 设置密码为 `postgres`
4. 端口保持 `5432`
5. 添加到系统 PATH: `C:\Program Files\PostgreSQL\15\bin`

详细步骤见：[POSTGRESQL_INSTALL.md](./POSTGRESQL_INSTALL.md)

#### 方式 B: 使用现有 PostgreSQL

如果您已有 PostgreSQL，只需：
```sql
-- 创建数据库
CREATE DATABASE customer_label;
```

---

### 步骤 2: 安装 Redis

**请选择以下任一方式**:

#### 方式 A: Windows 安装包

1. 下载 Redis Windows 版: https://github.com/microsoftarchive/redis/releases
2. 安装到 `C:\Redis`
3. 启动服务：`redis-server.exe redis.windows.conf`

#### 方式 B: Docker（如果有 Docker Desktop）

```bash
docker run -d -p 6379:6379 --name customer-label-redis redis:7-alpine
```

详细步骤见：[REDIS_INSTALL.md](./REDIS_INSTALL.md)

---

### 步骤 3: 验证安装

```bash
# 验证 PostgreSQL
psql --version
# 应该看到：psql (PostgreSQL) 15.x.x

psql -U postgres -h localhost -p 5432 -c "SELECT version();"

# 验证 Redis
redis-cli ping
# 应该返回：PONG
```

---

### 步骤 4: 安装项目依赖

```bash
cd d:\VsCode\customer-label
npm install
```

如果 npm 安装慢，可以使用淘宝镜像：
```bash
npm config set registry https://registry.npmmirror.com
npm install
```

---

### 步骤 5: 运行数据库迁移

```bash
# 确保 PostgreSQL 正在运行
# Windows: 服务管理器中查看 PostgreSQL 服务

# 运行迁移
npm run migration:run
```

**预期输出**:
```
query: SELECT * FROM current_schema()
query: CREATE TABLE "tag_recommendations" ...
query: CREATE INDEX "idx_rec_customer" ON "tag_recommendations" ...
Migration 1711507200000-CreateTagRecommendationsTable has been migrated successfully.
query: CREATE TABLE "tag_scores" ...
query: CREATE INDEX "idx_scores_overall" ON "tag_scores" ...
Migration 1711507260000-CreateTagScoresTable has been migrated successfully.
...
All migrations completed successfully!
```

---

### 步骤 6: 验证迁移结果

```bash
# 连接到数据库
psql -U postgres -d customer_label

# 查看所有表
\dt

# 应该看到：
# public.tag_recommendations
# public.tag_scores
# public.recommendation_rules
# public.clustering_configs
# public.feedback_statistics

# 查看表结构示例
\d tag_recommendations

# 退出
\q
```

---

### 步骤 7: 测试 Redis 连接

创建测试文件 `test-redis.ts`:

```typescript
import Redis from 'ioredis';

async function testRedis() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  try {
    console.log('Testing Redis connection...');
    await redis.set('test', 'Hello from customer-label!');
    const value = await redis.get('test');
    console.log('✅ Redis GET result:', value);
    
    await redis.del('test');
    await redis.quit();
    console.log('✅ Redis test completed successfully!');
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  }
}

testRedis();
```

运行测试：
```bash
npx ts-node test-redis.ts
```

---

## 🔍 故障排查

### 问题 1: psql 命令找不到

**解决方案**:
1. 确认 PostgreSQL 已安装
2. 添加 `C:\Program Files\PostgreSQL\15\bin` 到系统 PATH
3. 关闭所有命令行窗口，重新打开

### 问题 2: 无法连接到 PostgreSQL

**错误**: `FATAL: password authentication failed for user "postgres"`

**解决方案**:
```bash
# 重置密码
psql -U postgres
ALTER USER postgres WITH PASSWORD 'postgres';
\q
```

### 问题 3: 迁移失败

**可能原因**:
- 数据库未创建
- 用户名密码错误
- PostgreSQL 服务未运行

**检查清单**:
- [ ] PostgreSQL 服务是否运行？
- [ ] 数据库 `customer_label` 是否已创建？
- [ ] `.env` 文件中密码是否正确？
- [ ] 能否用 psql 连接到数据库？

### 问题 4: npm install 失败

**常见错误**: `network timeout` 或 `ECONNRESET`

**解决方案**:
```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
npm cache clean --force
npm install
```

### 问题 5: Redis 连接失败

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**解决方案**:
```bash
# Windows 启动 Redis
cd C:\Redis
redis-server.exe redis.windows.conf

# 或者作为服务启动
net start Redis

# 测试连接
redis-cli ping
```

---

## ✅ 验收标准

完成本任务后，应该满足以下条件：

- [x] ✅ PostgreSQL 已安装并运行
- [x] ✅ 数据库 `customer_label` 已创建
- [x] ✅ Redis 已安装并运行
- [x] ✅ 项目依赖已安装（node_modules 存在）
- [x] ✅ `.env` 文件配置正确
- [ ] ⏳ 数据库迁移成功执行（5 个表已创建）
- [ ] ⏳ Redis 连接测试通过
- [ ] ⏳ 可以正常连接到数据库和 Redis

---

## 📊 数据库表清单

迁移成功后，将创建以下表：

| 表名 | 说明 | 记录数预估 |
|------|------|------------|
| tag_recommendations | 标签推荐结果表 | 每月 10-50 万条 |
| tag_scores | 标签质量评分表 | 每个标签 1 条 |
| recommendation_rules | 推荐规则表 | 10-50 条 |
| clustering_configs | 聚类配置表 | 1-5 条 |
| feedback_statistics | 反馈统计表 | 每天 1 条 |

---

## 🎯 下一步计划

完成数据库和 Redis 配置后，继续执行：

**Task 1.3: 消息队列配置**
- [ ] 安装 Bull 包
- [ ] 配置消息队列
- [ ] 创建队列处理器

**Task 1.4: 项目脚手架搭建**
- [ ] 创建 NestJS 模块结构
- [ ] 配置依赖注入
- [ ] 配置日志和监控

---

## 📞 需要帮助？

如果在安装和迁移过程中遇到任何问题，请告诉我：

1. **具体的错误信息**（完整错误堆栈）
2. **您已经尝试过的步骤**
3. **您的环境信息**：
   - Windows 版本
   - Node.js 版本：`node --version`
   - npm 版本：`npm --version`

我会立即为您提供解决方案！

---

## 📚 相关文档

- [PostgreSQL 安装指南](./POSTGRESQL_INSTALL.md)
- [Redis 安装指南](./REDIS_INSTALL.md)
- [数据库迁移文档](./src/database/README.md)
- [TypeORM 实体文档](./src/entities.md)
- [OpenSpec 规范文档](./openspec/changes/add-smart-tag-recommendation/spec.md)

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26
