# E2E 集成测试指南

## 环境准备

### 1. 安装依赖

确保已安装以下开发依赖：
- Jest (测试框架)
- Supertest (HTTP 测试工具)
- @nestjs/testing (NestJS 测试模块)

这些依赖已在 `package.json` 中配置。

### 2. 数据库准备

E2E 测试需要独立的测试数据库：

```bash
# PostgreSQL - 创建测试数据库
createdb customer_label_test

# 或者使用 psql
psql -U postgres
CREATE DATABASE customer_label_test;
\q
```

### 3. Redis 准备（可选）

如果测试涉及缓存功能，需要启动 Redis：

```bash
# 使用 Docker
docker run -d -p 6379:6379 redis:latest

# 或直接启动本地 Redis 服务
redis-server
```

## 配置

### 环境变量

可以通过环境变量自定义测试配置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| TEST_DB_HOST | 测试数据库主机 | localhost |
| TEST_DB_PORT | 测试数据库端口 | 5432 |
| TEST_DB_USERNAME | 测试数据库用户名 | postgres |
| TEST_DB_PASSWORD | 测试数据库密码 | postgres |
| TEST_DB_DATABASE | 测试数据库名称 | customer_label_test |
| TEST_REDIS_URL | 测试 Redis URL | redis://localhost:6379 |

示例 `.env.test` 文件：
```env
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USERNAME=postgres
TEST_DB_PASSWORD=postgres
TEST_DB_DATABASE=customer_label_test
TEST_REDIS_URL=redis://localhost:6379
```

## 运行测试

### 运行所有 E2E 测试

```bash
npm run test:e2e
```

### 运行特定测试文件

```bash
# 规则管理 API 测试
npm run test:e2e -- rule-manager

# 聚类配置 API 测试
npm run test:e2e -- clustering-manager
```

### 详细输出模式

```bash
npm run test:e2e:verbose
```

### 监听模式（开发时使用）

```bash
npx jest --config ./test/jest-e2e.json --watch
```

## 测试覆盖范围

### ✅ 规则管理 API (rule-manager.e2e-spec.ts)

- **创建规则** (`POST /rules`)
  - 成功创建规则
  - 拒绝重复名称
  - 拒绝危险表达式（eval、Function 等）

- **查询规则** (`GET /rules`)
  - 分页查询
  - 按名称过滤
  - 按激活状态过滤
  - 排序功能

- **单个规则** (`GET /rules/:id`)
  - 获取规则详情
  - 404 处理

- **更新规则** (`PUT /rules/:id`)
  - 成功更新
  - 名称冲突检测

- **激活/停用** (`POST /rules/:id/activate`, `POST /rules/:id/deactivate`)

- **测试表达式** (`POST /rules/test`)
  - 有效表达式测试
  - 无效表达式检测

- **批量操作**
  - 批量导入 (`POST /rules/batch/import`)
  - 批量导出 (`GET /rules/batch/export`)
  - 部分失败处理

- **删除规则** (`DELETE /rules/:id`)

### ✅ 聚类配置 API (clustering-manager.e2e-spec.ts)

- **创建配置** (`POST /clustering`)
  - K-Means 算法配置
  - DBSCAN 算法配置
  - 层次聚类配置
  - 参数验证
  - 算法验证

- **查询配置** (`GET /clustering`)
  - 分页查询
  - 按算法过滤
  - 按激活状态过滤

- **单个配置** (`GET /clustering/:id`)
  - 获取配置详情
  - 404 处理

- **更新配置** (`PUT /clustering/:id`)

- **激活/停用** (`POST /clustering/:id/activate`, `POST /clustering/:id/deactivate`)

- **执行聚类** (`POST /clustering/:id/run`)
  - 成功执行
  - 拒绝未激活配置

- **统计信息** (`GET /clustering/:id/stats`)
  - 获取运行统计
  - 未运行配置处理

- **删除配置** (`DELETE /clustering/:id`)

## 测试数据管理

### 数据清理策略

当前测试使用以下策略：
1. **同步前清理**: 每个测试文件启动时删除并重建所有表（`dropSchema: true`）
2. **测试隔离**: 每个测试用例创建独立的数据
3. **自动清理**: 测试结束后关闭数据库连接

### 注意事项

⚠️ **重要**: E2E 测试会清空测试数据库的所有数据！

- 永远不要在 production 数据库上运行 E2E 测试
- 确保 `TEST_DB_DATABASE` 指向正确的测试数据库
- 测试数据在每次测试运行后会被清除

## 调试技巧

### 1. 单步调试

```bash
# 运行单个测试用例
npx jest --config ./test/jest-e2e.json -t "should create a new rule"

# 调试特定文件
npx jest --config ./test/jest-e2e.json --debug rule-manager.e2e-spec.ts
```

### 2. 查看详细日志

修改测试文件中的配置：
```typescript
const moduleFixture = await Test.createTestingModule({
  imports: [AppModule],
})
  .setLogger(new ConsoleLogger()) // 启用日志
  .compile();
```

### 3. 检查 HTTP 响应

```typescript
const response = await request(app.getHttpServer())
  .post('/rules')
  .send(testData)
  .expect(201);

console.log('Response:', response.body);
```

## 常见问题

### Q: 测试失败，提示数据库连接错误
**A**: 检查 PostgreSQL 是否运行，测试数据库是否存在，环境变量配置是否正确。

### Q: Redis 连接超时
**A**: 如果测试不涉及缓存功能，可以暂时不启动 Redis。或者修改配置禁用 Redis。

### Q: 测试运行很慢
**A**: 
1. 确保数据库索引正确
2. 减少不必要的日志输出
3. 使用 `--detectOpenHandles` 查找资源泄漏

### Q: 如何跳过某些测试
**A**: 使用 `.skip` 方法：
```typescript
describe.skip('暂时跳过的测试套件', () => {
  it('不会运行的测试', () => {
    // ...
  });
});
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:latest
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432
          TEST_DB_USERNAME: postgres
          TEST_DB_PASSWORD: postgres
          TEST_DB_DATABASE: customer_label_test
          TEST_REDIS_URL: redis://localhost:6379
```

## 下一步计划

- [ ] 添加推荐 API 的 E2E 测试
- [ ] 添加评分 API 的 E2E 测试
- [ ] 添加反馈 API 的 E2E 测试
- [ ] 添加认证和授权测试
- [ ] 性能基准测试
- [ ] 负载测试脚本
