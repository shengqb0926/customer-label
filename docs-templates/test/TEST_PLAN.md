# 测试计划文档

**项目名称**: 客户标签推荐系统  
**版本**: v1.0  
**编制日期**: 2026-03-30  
**测试负责人**: [待填写]

---

## 📋 一、测试范围

### 1.1 覆盖模块

| 模块 | 测试类型 | 优先级 | 说明 |
|------|---------|--------|------|
| **客户管理** | 单元/集成/E2E | P0 | CRUD、RFM 分析、批量操作 |
| **推荐引擎** | 单元/集成/E2E | P0 | 四大引擎实现、结果融合 |
| **缓存模块** | 单元/集成 | P0 | CacheService、装饰器、拦截器 |
| **配置管理** | 单元/集成 | P1 | 规则/聚类/关联配置 CRUD |
| **统计分析** | 单元/集成 | P2 | 客户统计、推荐统计 |
| **认证授权** | 单元/集成 | P1 | JWT 认证、RBAC 权限 |

### 1.2 不覆盖范围

- ❌ UI 自动化测试（仅手动测试）
- ❌ 性能压测（留待二期）
- ❌ 第三方集成测试（支付/短信）

---

## 🧪 二、测试策略

### 2.1 测试分层

```
         /\
        / E2E \         5-10 个场景
       / Tests \        核心用户路径
      /---------\
     /Integration\     20-30 个流程
    /    Tests    \    关键业务逻辑
   /---------------\
  /  Unit Tests    \   200+ 用例
 /__________________\  所有 Service/Controller
```

### 2.2 各层测试定义

| 层级 | 目标 | 框架 | 覆盖率目标 | 执行时间 |
|------|------|------|-----------|---------|
| **单元测试** | 验证最小可测试单元 | Jest (后端) / Vitest (前端) | Statements ≥ 30% (短期) | < 30s |
| **集成测试** | 验证模块间协作 | Supertest + TestContainers | 核心流程 100% | < 2min |
| **E2E 测试** | 验证完整用户场景 | Playwright | 关键路径 100% | < 5min |

---

## 📊 三、测试环境

### 3.1 环境配置

| 环境 | 用途 | 数据库 | 缓存 | 访问方式 |
|------|------|--------|------|---------|
| **本地开发** | 单元测试 | SQLite (内存) | Mock | localhost:3000 |
| **CI/CD** | 集成测试 | PostgreSQL (Docker) | Redis (Docker) | GitHub Actions |
| **测试环境** | E2E 测试 | PostgreSQL (独立实例) | Redis | test.example.com |

### 3.2 测试数据准备

```typescript
// 测试数据工厂
function createMockCustomer(overrides?: Partial<Customer>): Customer {
  return {
    id: faker.datatype.number(),
    name: faker.name.fullName(),
    email: faker.internet.email(),
    level: faker.helpers.arrayElement(['BRONZE', 'SILVER', 'GOLD']),
    totalAssets: faker.datatype.number({ min: 10000, max: 1000000 }),
    ...overrides,
  };
}

// 批量生成
const customers = createMockCustomers(100);
```

---

## ✅ 四、测试用例设计

### 4.1 单元测试用例示例

#### CustomerService 测试

```typescript
describe('CustomerService', () => {
  describe('findAll', () => {
    it('should return an array of customers with pagination', async () => {
      // Arrange
      const mockCustomers = createMockCustomers(10);
      mockRepository.find.mockResolvedValue(mockCustomers);

      // Act
      const result = await service.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(100);
    });

    it('should handle empty result', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll({});

      // Assert
      expect(result.data).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a customer when found', async () => {
      // Arrange
      const mockCustomer = createMockCustomer();
      mockRepository.findOne.mockResolvedValue(mockCustomer);

      // Act
      const result = await service.findOne(1);

      // Assert
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException when not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
```

### 4.2 集成测试用例示例

#### 推荐引擎 API 测试

```typescript
describe('POST /api/v1/recommendations/generate/:customerId', () => {
  it('should generate recommendations using rule engine', async () => {
    const customerId = 1;

    const response = await request(app.getHttpServer())
      .post(`/api/v1/recommendations/generate/${customerId}`)
      .send({ mode: 'rule' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBeGreaterThanOrEqual(0);
  });

  it('should generate recommendations using all engines', async () => {
    const customerId = 1;

    const response = await request(app.getHttpServer())
      .post(`/api/v1/recommendations/generate/${customerId}`)
      .send({ mode: 'all' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBeGreaterThan(0);
  });
});
```

### 4.3 E2E 测试用例示例

#### 客户管理工作流

```typescript
test('should complete customer management workflow', async ({ page }) => {
  // 1. 登录
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // 2. 查看客户列表
  await page.goto('/customers');
  await expect(page.locator('table')).toBeVisible();

  // 3. 新增客户
  await page.click('button:has-text("新增")');
  await page.fill('input[name="name"]', 'E2E 测试客户');
  await page.fill('input[name="email"]', 'e2e@test.com');
  await page.click('button:has-text("确定")');
  await expect(page.locator('.ant-message-success')).toBeVisible();

  // 4. 触发推荐引擎
  await page.click('button:has-text("规则")');
  await expect(page.locator('.ant-message-success')).toContainText(/生成 \d+ 条推荐/);

  // 5. 查看推荐列表
  await page.goto('/recommendations');
  await expect(page.locator('tbody tr')).toHaveCount({ min: 1 });
});
```

---

## 📈 五、测试覆盖率门禁

### 5.1 Jest 配置

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/main.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 30,
      branches: 25,
      functions: 35,
      lines: 30,
    },
  },
};
```

### 5.2 CI/CD 门禁脚本

```bash
#!/bin/bash
# scripts/check-coverage.sh

THRESHOLD=30
COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.statements.pct')

if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
  echo "❌ Coverage $COVERAGE% is below threshold $THRESHOLD%"
  exit 1
fi

echo "✅ Coverage $COVERAGE% meets threshold"
exit 0
```

---

## 🐛 六、缺陷管理

### 6.1 Bug 分级标准

| 级别 | 定义 | 响应 SLA | 示例 |
|------|------|----------|------|
| **P0 致命** | 系统崩溃、数据丢失 | 15 分钟响应，1 小时修复 | 数据库连接失败 |
| **P1 严重** | 核心功能失效 | 30 分钟响应，4 小时修复 | 推荐引擎无法执行 |
| **P2 一般** | 非核心功能异常 | 2 小时响应，24 小时修复 | 导出 Excel 格式错误 |
| **P3 轻微** | UI 瑕疵、体验问题 | 1 天响应，1 周修复 | 按钮颜色不一致 |

### 6.2 Bug 报告模板

```markdown
## Bug 描述

**标题**: [推荐引擎] 置信度溢出数据库  
**严重程度**: P1  
**发现版本**: v1.0.0  

## 复现步骤

1. 对同一客户多次触发推荐引擎
2. 融合引擎计算多来源加成
3. 置信度超过 1.0

**预期结果**: 置信度 <= 1.0  
**实际结果**: 1.05（数据库报错）

## 根本原因

缺少置信度上限校验

## 解决方案

```typescript
confidence: Math.min(fusedConfidence, 0.9999)
```

## 验证结果

- [x] 已修复并测试通过
- [x] 已添加边界值测试用例
```

---

## 🔄 七、持续集成

### 7.1 GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [develop, master]
  pull_request:
    branches: [develop]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm test -- --coverage
      - name: Check coverage threshold
        run: ./scripts/check-coverage.sh

  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
      redis:
        image: redis:6-alpine
    steps:
      - uses: actions/checkout@v3
      - name: Run integration tests
        run: npm run test:integration

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
```

---

## 📋 八、测试交付物

### 8.1 必须文档

- [x] 测试计划（本文档）
- [ ] 测试用例集（Excel/TestRail）
- [x] 测试报告（自动生成）
- [ ] Bug 追踪清单（GitHub Issues）

### 8.2 可选文档

- [ ] 性能基准报告
- [ ] 自动化测试脚本说明
- [ ] 测试环境部署手册

---

## 📚 九、参考资源

- [Testing Guidelines](../standards/TESTING_GUIDELINES.md)
- [Jest 官方文档](https://jestjs.io/)
- [Playwright 官方文档](https://playwright.dev/)

---

**文档版本**: v1.0  
**编制人**: [待填写]  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
