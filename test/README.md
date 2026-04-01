# E2E 端到端测试指南

本目录包含客户标签智能推荐系统的完整 E2E 测试套件。

## 📋 测试文件清单

### 核心业务测试
1. **customer.e2e-spec.ts** - 客户管理 API 测试
   - CRUD 操作（创建、读取、更新、删除）
   - RFM 分析（分段、高价值客户识别）
   - 批量操作（批量创建、批量删除）
   - 错误处理（404、400、重复数据）

2. **recommendation.e2e-spec.ts** - 推荐系统测试
   - 规则管理（创建、查询、更新）
   - 推荐生成（规则引擎模式）
   - 推荐操作（接受、拒绝、撤销）
   - 统计报告（状态统计、来源统计）
   - 筛选与搜索（多条件组合）

3. **auth.e2e-spec.ts** - 认证与授权测试
   - 用户注册（唯一性验证、密码强度）
   - 用户登录（JWT 令牌颁发）
   - 受保护路由（权限验证）
   - 健康检查与版本信息
   - API 文档访问

4. **business-flow.e2e-spec.ts** - 完整业务流程测试
   - 客户生命周期管理
   - 推荐生命周期管理
   - 批量操作流程
   - 搜索与筛选流程
   - 分析报告流程
   - 系统监控

### 已有测试
5. **rule-manager.e2e-spec.ts** - 规则管理器专项测试
6. **clustering-manager.e2e-spec.ts** - 聚类管理器专项测试

## 🚀 快速开始

### 前置条件

1. **安装依赖**
```bash
npm install --save-dev @types/jest @types/supertest jest ts-jest supertest
```

2. **准备测试数据库**

创建专用的测试数据库：

```sql
CREATE DATABASE customer_label_test;
```

3. **环境变量配置**

创建 `.env.test` 文件或设置以下环境变量：

```bash
# 测试数据库配置
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USERNAME=postgres
TEST_DB_PASSWORD=postgres
TEST_DB_DATABASE=customer_label_test

# 测试 Redis 配置
TEST_REDIS_URL=redis://localhost:6379

# JWT 配置（仅用于测试）
JWT_SECRET=test-secret-key-for-e2e-testing-only-12345
JWT_EXPIRES_IN=1h
```

### 运行测试

#### 运行所有 E2E 测试
```bash
npm run test:e2e
```

#### 运行特定测试文件
```bash
# 运行客户管理测试
npm run test:e2e -- customer.e2e-spec.ts

# 运行推荐系统测试
npm run test:e2e -- recommendation.e2e-spec.ts

# 运行认证测试
npm run test:e2e -- auth.e2e-spec.ts

# 运行业务流程测试
npm run test:e2e -- business-flow.e2e-spec.ts
```

#### 详细输出模式
```bash
npm run test:e2e:verbose
```

#### 并行运行测试（加快速度）
```bash
# 使用多个 worker 并行运行
jest -config ./test/jest-e2e.json --workers=4
```

## 📊 测试覆盖率

查看 E2E 测试的覆盖率报告：

```bash
jest -config ./test/jest-e2e.json --coverage
```

## 🔧 测试工具函数

### test-utils.ts

提供通用的测试辅助功能：

```typescript
import { getTestConfig, createTestTypeOrmConfig, sleep, generateTestIdentifier } from './test-utils';

// 获取测试配置
const config = getTestConfig();

// 创建 TypeORM 配置
const typeOrmConfig = createTestTypeOrmConfig();

// 等待指定毫秒
await sleep(1000);

// 生成唯一标识符（避免命名冲突）
const uniqueId = generateTestIdentifier('customer');
// 输出：customer_1234567890_abc1234
```

## 📝 测试规范

### 命名约定
- 文件名：`*.e2e-spec.ts`
- describe 块：按功能模块组织，如 `Customer CRUD Operations`
- 测试用例：使用中文或英文清晰描述测试场景，如 `should create a new customer`

### 测试数据管理
1. **唯一性保证**: 使用 `generateTestIdentifier()` 或时间戳确保测试数据唯一
2. **清理机制**: 在 `afterAll` 中清理创建的测试数据
3. **事务隔离**: 每个测试用例应独立，不依赖其他测试的状态

### 断言最佳实践
```typescript
// ✅ 好的做法 - 明确期望值
expect(response.status).toBe(201);
expect(response.body.id).toBeDefined();
expect(Array.isArray(response.body.data)).toBe(true);

// ❌ 避免的做法 - 过于宽松的断言
expect(response.body).toBeTruthy();
```

## 🎯 测试场景覆盖

### Customer API
- [x] 创建单个客户
- [x] 批量创建客户
- [x] 获取客户详情
- [x] 获取客户列表（分页）
- [x] 更新客户信息
- [x] 删除单个客户
- [x] 批量删除客户
- [x] 客户统计信息
- [x] RFM 分析
- [x] RFM 分段查询
- [x] 高价值客户识别
- [x] 错误处理（404、400、重复）

### Recommendation API
- [x] 创建推荐规则
- [x] 获取规则列表
- [x] 更新规则
- [x] 生成推荐（规则引擎）
- [x] 获取客户推荐
- [x] 接受推荐
- [x] 拒绝推荐
- [x] 推荐统计
- [x] 多条件筛选
- [x] 日期范围过滤
- [x] 排序功能

### Auth API
- [x] 用户注册
- [x] 用户登录
- [x] JWT 令牌验证
- [x] 受保护路由访问
- [x] 密码强度验证
- [x] 唯一性约束
- [x] 错误认证处理

### Business Flow
- [x] 完整客户生命周期
- [x] 完整推荐生命周期
- [x] 批量操作流程
- [x] 搜索与筛选流程
- [x] 统计分析流程
- [x] 系统健康检查

## 🐛 常见问题

### 1. 测试失败：无法连接到数据库
**解决方案**: 确保测试数据库已创建且服务正在运行
```bash
# 检查 PostgreSQL 服务
pg_isready

# 创建测试数据库
createdb customer_label_test
```

### 2. 端口冲突错误
**解决方案**: 清理被占用的端口
```bash
npm run clean:ports
```

### 3. 测试超时
**解决方案**: 增加 Jest 超时时间
```json
// jest-e2e.json
{
  "testTimeout": 30000
}
```

### 4. Redis 连接失败
**解决方案**: 启动 Redis 服务或使用 Mock
```bash
# 启动 Redis
redis-server

# 或在 .env.test 中禁用 Redis
REDIS_CLUSTER_ENABLED=false
```

## 📈 CI/CD 集成

### GitHub Actions 示例
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: customer_label_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
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

## 🎓 学习资源

- [NestJS 测试文档](https://docs.nestjs.com/fundamentals/testing)
- [Jest 官方文档](https://jestjs.io/)
- [Supertest 使用指南](https://github.com/ladjs/supertest)
- [TypeORM 测试配置](https://typeorm.io/#/testing)

## 📞 支持与反馈

如有问题或建议，请提交 Issue 或联系开发团队。

---

**最后更新**: 2026-03-31
**维护者**: 开发团队
