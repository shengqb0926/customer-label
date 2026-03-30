# 测试规范 (Testing Guidelines)

**版本**: v1.0  
**生效日期**: 2026-03-30  
**适用范围**: customer-label 项目全体开发与测试人员

---

## 📊 一、测试分层策略

### 1.1 测试金字塔

```
           /\
          /  \
         / E2E \        少量（5-10 个）
        / Tests \       覆盖核心用户路径
       /---------\
      /           \
     / Integration \    中量（20-30 个）
    /     Tests     \   覆盖关键业务流程
   /-----------------\
  /                   \
 /    Unit Tests       \  大量（200+）
/_______________________\ 覆盖所有 Service/Controller/Utils
```

### 1.2 各层测试定义

| 层级 | 目标 | 框架 | 覆盖率目标 | 执行时间 |
|------|------|------|-----------|---------|
| **单元测试** | 验证最小可测试单元 | Jest/Vitest | Statements ≥ 80% (核心模块) | < 30s |
| **集成测试** | 验证模块间协作 | Supertest + TestContainers | 核心流程 100% | < 2min |
| **E2E 测试** | 验证完整用户场景 | Playwright | 关键路径 100% | < 5min |

---

## 🧪 二、单元测试规范

### 2.1 测试文件组织

```bash
src/
├── modules/
│   ├── customer/
│   │   ├── customer.service.ts
│   │   └── customer.service.spec.ts      # ✅ 同级命名
│   ├── recommendation/
│   │   ├── engines/
│   │   │   ├── rule-engine.service.ts
│   │   │   └── rule-engine.service.spec.ts
│   │   └── recommendation.service.ts
│   │   └── recommendation.service.spec.ts
```

### 2.2 测试套件结构模板

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerService } from './customer.service';
import { Customer } from './entities/customer.entity';
import { CacheService } from '../cache/cache.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let mockRepository: MockType<Repository<Customer>>;
  let mockCacheService: MockType<CacheService>;

  // Mock 工厂函数
  const repositoryMockFactory: () => MockType<Repository<Customer>> = () => ({
    find: jest.fn(x => x),
    findOne: jest.fn(x => x),
    save: jest.fn(x => x),
    remove: jest.fn(x => x),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().returnThis(),
      andWhere: jest.fn().returnThis(),
      orderBy: jest.fn().returnThis(),
      skip: jest.fn().returnThis(),
      take: jest.fn().returnThis(),
      getManyAndCount: jest.fn().returnThis(),
      getOne: jest.fn().returnThis(),
    })),
  });

  const cacheServiceMockFactory: () => MockType<CacheService> = () => ({
    get: jest.fn(x => x),
    set: jest.fn(x => x),
    delete: jest.fn(x => x),
    getOrSet: jest.fn(x => x),
  });

  // 测试前置 setup
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: getRepositoryToken(Customer),
          useFactory: repositoryMockFactory,
        },
        {
          provide: CacheService,
          useFactory: cacheServiceMockFactory,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    mockRepository = module.get(getRepositoryToken(Customer));
    mockCacheService = module.get(CacheService);

    // 重置所有 Mock 调用记录
    jest.clearAllMocks();
  });

  // 清理后置
  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========== 测试用例分组 ==========

  describe('findAll', () => {
    it('should return an array of customers with pagination', async () => {
      // Arrange - 准备测试数据
      const mockCustomers = [
        { id: 1, name: '张三', level: 'GOLD' },
        { id: 2, name: '李四', level: 'SILVER' },
      ];
      const mockTotal = 100;
      
      mockRepository.find.mockResolvedValue(mockCustomers);
      // Mock query builder count
      (mockRepository.createQueryBuilder as any).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockCustomers, mockTotal]),
      });

      // Act - 执行被测试的方法
      const result = await service.findAll({ page: 1, limit: 10 });

      // Assert - 断言结果
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(mockTotal);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      
      // 验证 Mock 调用
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should handle empty result', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should apply filters when provided', async () => {
      // Arrange
      const filterParams = { level: 'GOLD', city: '北京' };
      mockRepository.find.mockResolvedValue([]);

      // Act
      await service.findAll(filterParams);

      // Assert
      // 验证查询包含过滤条件
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('customer');
    });
  });

  describe('findOne', () => {
    it('should return a customer when found', async () => {
      // Arrange
      const mockCustomer = { id: 1, name: '张三', level: 'GOLD' };
      mockRepository.findOne.mockResolvedValue(mockCustomer);

      // Act
      const result = await service.findOne(1);

      // Assert
      expect(result).toEqual(mockCustomer);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Customer not found');
    });
  });

  describe('create', () => {
    it('should create a new customer', async () => {
      // Arrange
      const createDto: CreateCustomerDto = {
        name: '王五',
        email: 'wangwu@example.com',
        level: 'BRONZE',
      };
      const savedCustomer = { id: 1, ...createDto };
      mockRepository.create.mockReturnValue(savedCustomer);
      mockRepository.save.mockResolvedValue(savedCustomer);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.name).toBe(createDto.name);
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(savedCustomer);
    });

    it('should validate email format', async () => {
      // Arrange
      const invalidDto = { ...createDto, email: 'invalid-email' };

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a customer', async () => {
      // Arrange
      const mockCustomer = { id: 1, name: '张三' };
      mockRepository.findOne.mockResolvedValue(mockCustomer);
      mockRepository.remove.mockResolvedValue(undefined);

      // Act
      await service.remove(1);

      // Assert
      expect(mockRepository.remove).toHaveBeenCalledWith(mockCustomer);
    });

    it('should throw NotFoundException when deleting non-existent customer', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
```

### 2.3 Mock 数据工厂

```typescript
/**
 * Mock 数据工厂函数
 * 提供一致的测试数据生成
 */
function createMockCustomer(overrides?: Partial<Customer>): Customer {
  return {
    id: faker.datatype.number(),
    name: faker.name.fullName(),
    email: faker.internet.email(),
    level: faker.helpers.arrayElement(['BRONZE', 'SILVER', 'GOLD']),
    totalAssets: faker.datatype.number({ min: 10000, max: 1000000 }),
    riskLevel: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']),
    isActive: faker.datatype.boolean(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

// 批量生成
function createMockCustomers(count: number): Customer[] {
  return Array.from({ length: count }, (_, i) =>
    createMockCustomer({ id: i + 1 })
  );
}

// 使用示例
const vipCustomer = createMockCustomer({
  level: 'DIAMOND',
  totalAssets: 10000000,
});

const customers = createMockCustomers(10);
```

### 2.4 断言最佳实践

```typescript
// ✅ 具体明确的断言
expect(result.success).toBe(true);
expect(result.data).toHaveLength(5);
expect(result.total).toBeGreaterThan(100);
expect(mockFunction).toHaveBeenCalledTimes(1);
expect(mockFunction).toHaveBeenCalledWith({ id: 1 });

// ❌ 模糊宽泛的断言
expect(result).toBeTruthy();              // 太宽泛
expect(result).toEqual(expect.anything()); // 无意义
expect(result).toBeDefined();             // 不够具体

// ✅ 对象比较（使用部分匹配）
expect(customer).toMatchObject({
  id: 1,
  name: '张三',
  level: 'GOLD',
});

// ✅ 数组内容验证
expect(customers).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ id: 1 }),
  ])
);

// ✅ 异常验证
await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
await expect(service.findOne(999)).rejects.toThrow(/not found/i);
```

---

## 🔗 三、集成测试规范

### 3.1 API 集成测试

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnection } from 'typeorm';

describe('Customer API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    // 创建测试应用模块
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // 配置全局管道
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    
    await app.init();

    // 获取认证 Token（如果需要）
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);
    
    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // 清理资源
    await app.close();
    const connection = getConnection();
    await connection.close();
  });

  describe('GET /api/v1/customers', () => {
    it('should return paginated customers', () => {
      return request(app.getHttpServer())
        .get('/api/v1/customers?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.pagination).toBeDefined();
          expect(res.body.pagination.page).toBe(1);
          expect(res.body.pagination.limit).toBe(10);
        });
    });

    it('should filter by level', () => {
      return request(app.getHttpServer())
        .get('/api/v1/customers?level=GOLD')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          res.body.data.forEach((customer: any) => {
            expect(customer.level).toBe('GOLD');
          });
        });
    });
  });

  describe('POST /api/v1/customers', () => {
    it('should create a new customer', () => {
      const newCustomer = {
        name: '测试客户',
        email: 'test@example.com',
        level: 'BRONZE',
        totalAssets: 500000,
      };

      return request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCustomer)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe(newCustomer.name);
          expect(res.body.data.email).toBe(newCustomer.email);
        });
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '测试', email: 'invalid' })
        .expect(400);
    });
  });

  describe('POST /api/v1/recommendations/generate/:customerId', () => {
    it('should generate recommendations using rule engine', async () => {
      const customerId = 1;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/recommendations/generate/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mode: 'rule' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });

    it('should generate recommendations using all engines', async () => {
      const customerId = 1;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/recommendations/generate/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mode: 'all' })
        .expect(201);

      expect(response.body.success).toBe(true);
      // 全引擎模式应生成更多推荐
      expect(response.body.count).toBeGreaterThan(0);
    });
  });
});
```

### 3.2 使用 TestContainers（可选）

```typescript
import {
  GenericContainer,
  StartedTestContainer,
} from 'testcontainers';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('Database Integration Tests', () => {
  let container: StartedTestContainer;
  let dbHost: string;
  let dbPort: number;

  beforeAll(async () => {
    // 启动 PostgreSQL 容器
    container = await new GenericContainer('postgres:14')
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'test_db',
      })
      .withExposedPorts(5432)
      .start();

    dbHost = container.getHost();
    dbPort = container.getMappedPort(5432);
  }, 60000); // 增加超时时间

  afterAll(async () => {
    await container.stop();
  });

  it('should connect to real database', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: dbHost,
          port: dbPort,
          username: 'test',
          password: 'test',
          database: 'test_db',
          entities: [Customer],
          synchronize: true,
        }),
        CustomerModule,
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    // 执行真实数据库操作...
    
    await app.close();
  });
});
```

---

## 🎭 四、E2E 测试规范

### 4.1 Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'e2e-results.json' }]],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 4.2 E2E 测试示例

```typescript
// e2e/customer-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    // 登录系统
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display customer list', async ({ page }) => {
    await page.goto('/customers');
    
    // 验证页面标题
    await expect(page.locator('h1')).toContainText('客户管理');
    
    // 验证表格存在
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // 验证分页控件
    await expect(page.locator('.ant-pagination')).toBeVisible();
  });

  test('should create a new customer', async ({ page }) => {
    await page.goto('/customers');
    
    // 点击新增按钮
    await page.click('button:has-text("新增")');
    
    // 填写表单
    await page.fill('input[name="name"]', 'E2E 测试客户');
    await page.fill('input[name="email"]', 'e2e@test.com');
    await page.selectOption('select[name="level"]', 'BRONZE');
    
    // 提交表单
    await page.click('button:has-text("确定")');
    
    // 验证成功提示
    await expect(page.locator('.ant-message-success')).toBeVisible();
    
    // 验证列表中显示新客户
    await expect(page.locator('table')).toContainText('E2E 测试客户');
  });

  test('should trigger recommendation engine', async ({ page }) => {
    await page.goto('/customers');
    
    // 找到第一个客户行
    const firstRow = page.locator('tbody tr').first();
    
    // 点击规则引擎按钮
    await firstRow.locator('button:has-text("规则")').click();
    
    // 等待执行完成
    await expect(page.locator('.ant-message-success')).toBeVisible({
      timeout: 10000,
    });
    
    // 验证提示信息包含生成数量
    const message = await page.locator('.ant-message-success').textContent();
    expect(message).toMatch(/生成 \d+ 条推荐/);
    
    // 跳转到推荐列表验证
    await page.goto('/recommendations');
    await expect(page.locator('tbody tr')).toHaveCount({ min: 1 });
  });

  test('should filter customers by level', async ({ page }) => {
    await page.goto('/customers');
    
    // 选择筛选条件
    await page.selectOption('select[name="level"]', 'GOLD');
    await page.click('button:has-text("查询")');
    
    // 等待表格刷新
    await page.waitForLoadState('networkidle');
    
    // 验证所有显示的客户都是 GOLD 等级
    const levelTags = page.locator('td', { hasText: 'GOLD' });
    const allGold = await levelTags.evaluateAll(
      (elements) => elements.length > 0
    );
    expect(allGold).toBe(true);
  });

  test('should export customer data', async ({ page }) => {
    await page.goto('/customers');
    
    // 点击下载按钮
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("导出")');
    const download = await downloadPromise;
    
    // 验证文件下载
    expect(download.suggestedFilename()).toMatch(/customers.*\.xlsx/);
    
    // 保存文件到临时目录
    const tempPath = `/tmp/${download.suggestedFilename()}`;
    await download.saveAs(tempPath);
    
    // 验证文件大小（非空）
    const fs = require('fs');
    const stats = fs.statSync(tempPath);
    expect(stats.size).toBeGreaterThan(0);
  });
});
```

---

## 📈 五、测试覆盖率门禁

### 5.1 Jest 配置

```javascript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',           // 排除测试文件本身
    '!**/main.ts',             // 排除入口文件
    '!**/*.module.ts',         // 排除模块定义
    '!**/*.dto.ts',            // 排除 DTO
    '!**/*.entity.ts',         // 排除实体
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      statements: 30,    // 短期目标
      branches: 25,
      functions: 35,
      lines: 30,
    },
  },
  coverageReporters: [
    'text',
    'lcov',
    'json-summary',      // 用于 CI/CD 解析
  ],
};
```

### 5.2 覆盖率目标演进路线

| 阶段 | Statements | Branches | Functions | Lines | 适用时期 |
|------|-----------|----------|-----------|-------|---------|
| **短期** | ≥ 30% | ≥ 25% | ≥ 35% | ≥ 30% | 项目初期（0-3 个月） |
| **中期** | ≥ 50% | ≥ 40% | ≥ 55% | ≥ 50% | 项目成长期（3-6 个月） |
| **长期** | ≥ 80% | ≥ 70% | ≥ 85% | ≥ 80% | 成熟期（6 个月+） |
| **核心模块** | ≥ 90% | ≥ 85% | ≥ 95% | ≥ 90% | 关键业务逻辑 |

### 5.3 覆盖率报告分析

```bash
# 运行测试并生成覆盖率
npm test -- --coverage

# 查看 HTML 报告
open coverage/index.html
```

**高覆盖率模块示例** (>80%):
```
✅ CacheService: 100%
✅ SimilarityService: 82.14%
✅ RuleEngine: 85%
✅ FusionEngine: 88%
```

**待改进模块** (<20%):
```
❌ AuthModule: 15%
❌ ScoringService: 18%
❌ UserModule: 12%
```

---

## 🐛 六、缺陷管理

### 6.1 Bug 分级标准

| 级别 | 定义 | 响应 SLA | 示例 |
|------|------|----------|------|
| **P0 致命** | 系统崩溃、数据丢失 | 15 分钟响应，1 小时修复 | 数据库连接失败导致服务不可用 |
| **P1 严重** | 核心功能失效 | 30 分钟响应，4 小时修复 | 推荐引擎无法执行 |
| **P2 一般** | 非核心功能异常 | 2 小时响应，24 小时修复 | 导出 Excel 格式错误 |
| **P3 轻微** | UI 瑕疵、体验问题 | 1 天响应，1 周修复 | 按钮颜色不一致 |

### 6.2 Bug 报告模板

```markdown
## Bug 描述

**标题**: [模块名] 简短描述问题  
**严重程度**: P0/P1/P2/P3  
**发现版本**: v1.0.0  
**发现环境**: 生产环境/测试环境  

## 复现步骤

1. 打开客户列表页
2. 点击"规则引擎"按钮
3. 观察控制台报错

**预期结果**: 显示成功提示，生成 X 条推荐  
**实际结果**: 抛出 TypeError: Cannot read property 'id' of undefined

## 环境信息

- OS: Windows 11
- Browser: Chrome 120
- Node.js: v18.17.0

## 日志与截图

```
Error: TypeError: Cannot read property 'id' of undefined
    at RecommendationService.generateForCustomer (recommendation.service.ts:123)
```

![错误截图](attachment.png)

## 根本原因分析

通过调试发现，当客户不存在时未进行空值检查...

## 解决方案

在 `recommendation.service.ts:120` 添加客户存在性验证：

```typescript
if (!customer) {
  throw new NotFoundException(`Customer ${customerId} not found`);
}
```

## 验证结果

- [x] 已修复并本地测试通过
- [x] 已添加回归测试用例
- [x] 已部署到测试环境验证
- [ ] 已上线生产环境
```

---

## 🔄 七、持续集成中的测试

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
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage --testPathIgnorePatterns="\\.e2e-spec\\.ts$"
      
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.statements.pct')
          if (( $(echo "$COVERAGE < 30" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% is below threshold 30%"
            exit 1
          fi
          echo "✅ Coverage $COVERAGE% meets threshold"
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          token: ${{ secrets.CODECOV_TOKEN }}

  integration-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:6-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run database migrations
        run: npm run typeorm migration:run
        env:
          TYPEORM_HOST: localhost
          TYPEORM_PORT: 5432
      
      - name: Run integration tests
        run: npm run test:e2e
        env:
          TYPEORM_HOST: localhost
          REDIS_HOST: localhost
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/

  e2e-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Start application server
        run: npm run start:prod &
        env:
          PORT: 3000
      
      - name: Wait for server to be ready
        run: npx wait-on http://localhost:3000 -t 60000
      
      - name: Run E2E tests
        run: npm run test:e2e:playwright
      
      - name: Upload E2E report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-report
          path: playwright-report/
```

### 7.2 质量门禁检查脚本

```bash
#!/bin/bash
# scripts/check-coverage.sh

THRESHOLD_STATEMENTS=30
THRESHOLD_BRANCHES=25
THRESHOLD_FUNCTIONS=35
THRESHOLD_LINES=30

# 解析覆盖率报告
STATEMENTS=$(cat coverage/coverage-summary.json | jq '.total.statements.pct')
BRANCHES=$(cat coverage/coverage-summary.json | jq '.total.branches.pct')
FUNCTIONS=$(cat coverage/coverage-summary.json | jq '.total.functions.pct')
LINES=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')

echo "📊 测试覆盖率报告:"
echo "===================="
printf "Statements: %.2f%% (阈值：≥%d%%) " $STATEMENTS $THRESHOLD_STATEMENTS
if (( $(echo "$STATEMENTS >= $THRESHOLD_STATEMENTS" | bc -l) )); then
  echo "✅"
else
  echo "❌"
  exit 1
fi

printf "Branches:   %.2f%% (阈值：≥%d%%) " $BRANCHES $THRESHOLD_BRANCHES
if (( $(echo "$BRANCHES >= $THRESHOLD_BRANCHES" | bc -l) )); then
  echo "✅"
else
  echo "❌"
  exit 1
fi

printf "Functions:  %.2f%% (阈值：≥%d%%) " $FUNCTIONS $THRESHOLD_FUNCTIONS
if (( $(echo "$FUNCTIONS >= $THRESHOLD_FUNCTIONS" | bc -l) )); then
  echo "✅"
else
  echo "❌"
  exit 1
fi

printf "Lines:      %.2f%% (阈值：≥%d%%) " $LINES $THRESHOLD_LINES
if (( $(echo "$LINES >= $THRESHOLD_LINES" | bc -l) )); then
  echo "✅"
else
  echo "❌"
  exit 1
fi

echo "===================="
echo "🎉 所有覆盖率指标达标！"
exit 0
```

---

## 📋 八、测试文档清单

### 8.1 必须维护的文档

- [x] **测试计划** (`docs/test/TEST_PLAN.md`)
  - 测试范围与策略
  - 资源与时间安排
  - 准入准出标准

- [ ] **测试用例集** (`docs/test/TEST_CASES.md`)
  - 按模块分类的测试用例
  - 输入数据与预期结果

- [x] **测试执行报告** (`coverage/coverage-summary.txt`)
  - 每次构建自动生成
  - 包含覆盖率趋势图

- [ ] **Bug 追踪清单** (`docs/test/BUG_TRACKING.md`)
  - 使用 GitHub Issues 或 Excel
  - 记录修复状态与验证结果

### 8.2 可选文档

- [ ] **性能基准报告** (`docs/test/PERFORMANCE_BENCHMARK.md`)
  - 关键 API 响应时间基线
  - 负载测试结果

- [ ] **自动化测试脚本说明** (`docs/test/AUTOMATION_GUIDE.md`)
  - Playwright 脚本编写指南
  - Mock 数据生成方法

---

## 🎯 九、测试成熟度评估

| 等级 | 特征 | 本项目状态 |
|------|------|-----------|
| **L1 初始级** | 手动测试为主，无自动化 | ❌ |
| **L2 可重复级** | 单元测试覆盖核心逻辑 | ✅ 当前状态 |
| **L3 已定义级** | 完整的三层测试体系 | 🔄 进行中 |
| **L4 已管理级** | 覆盖率>80%，CI/CD 集成 | ⏳ 目标 |
| **L5 优化级** | 数据驱动，持续优化 | ⏳ 长期目标 |

---

## 📚 十、参考资源

### 10.1 测试框架

- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [Playwright 官方文档](https://playwright.dev/docs/intro)
- [Testing Library](https://testing-library.com/)

### 10.2 最佳实践

- 《Effective Testing in TypeScript》
- [Google Testing Blog](https://testing.googleblog.com/)
- [Martin Fowler on Testing](https://martinfowler.com/bliki/TestCoverage.html)

---

**文档版本**: v1.0  
**编制日期**: 2026-03-30  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
