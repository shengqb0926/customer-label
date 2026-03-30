# 开发规范 (Coding Standards)

**版本**: v1.0  
**生效日期**: 2026-03-30  
**适用范围**: customer-label 项目全体开发人员

---

## 📋 一、命名规范

### 1.1 变量与函数命名

```typescript
// ✅ 正确示例 - camelCase
const customerName = '张三';
let totalCount = 0;
function calculateTotalPrice() { }
const getCustomerById = async (id: number) => { };

// ❌ 错误示例
const CustomerName = '张三';        // 不应 PascalCase
const customer_name = '张三';       // 不应 snake_case
function getTotalCount() { }        // 函数名应动词开头
```

### 1.2 类与接口命名

```typescript
// ✅ 正确示例 - PascalCase
class CustomerService { }
interface UserDTO { }
type RecommendationResult = { };
enum CustomerLevel { BRONZE, SILVER, GOLD }

// ❌ 错误示例
class customerService { }           // 不应 camelCase
interface user_dto { }              // 不应 snake_case
```

### 1.3 常量命名

```typescript
// ✅ 正确示例 - UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 10;
const CACHE_TTL = 3600;

// ❌ 错误示例
const maxRetryCount = 3;            // 普通变量才用 camelCase
const Max_Retry_Count = 3;          // 不应 Pascal Case
```

### 1.4 文件命名

```bash
# ✅ 正确示例 - kebab-case
customer-list.tsx                   # React 组件
customer.service.ts                 # Service 层
recommendation.controller.ts        # Controller
cache.interceptor.spec.ts           # 测试文件

# ❌ 错误示例
CustomerList.tsx                    # 不应 PascalCase (除非组件入口文件)
customer_service.ts                 # 不应 snake_case
customerList.ts                     # 不应 camelCase
```

### 1.5 特殊标识符

```typescript
// 私有成员使用下划线前缀（TypeScript 推荐）
class CacheService {
  private _cachePrefix = 'cache:';
  
  private _generateKey(key: string): string {
    return `${this._cachePrefix}${key}`;
  }
}

// 未使用参数使用下划线
array.map((item, _index) => item.name);
```

---

## 📁 二、目录结构规范

### 2.1 标准项目结构

```
customer-label/
├── src/
│   ├── main.ts                     # 应用入口
│   ├── app.module.ts               # 根模块
│   │
│   ├── common/                     # 公共模块（跨业务复用）
│   │   ├── cache/                  # 缓存模块
│   │   │   ├── cache.decorator.ts
│   │   │   ├── cache.interceptor.ts
│   │   │   ├── cache.module.ts
│   │   │   └── index.ts
│   │   ├── similarity/             # 相似度计算
│   │   └── filters/                # 异常过滤器
│   │
│   ├── infrastructure/             # 基础设施层
│   │   ├── redis/                  # Redis 服务
│   │   │   ├── redis.service.ts
│   │   │   ├── cache.service.ts
│   │   │   └── redis.module.ts
│   │   ├── database/               # 数据库配置
│   │   └── queue/                  # 消息队列
│   │
│   ├── modules/                    # 业务模块
│   │   ├── customer/               # 客户管理模块
│   │   │   ├── entities/
│   │   │   │   └── customer.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-customer.dto.ts
│   │   │   │   └── update-customer.dto.ts
│   │   │   ├── customer.controller.ts
│   │   │   ├── customer.service.ts
│   │   │   └── customer.module.ts
│   │   ├── recommendation/         # 推荐引擎模块
│   │   │   ├── engines/            # 子引擎实现
│   │   │   │   ├── rule-engine.service.ts
│   │   │   │   ├── clustering-engine.service.ts
│   │   │   │   ├── association-engine.service.ts
│   │   │   │   └── fusion-engine.service.ts
│   │   │   ├── recommendation.controller.ts
│   │   │   ├── recommendation.service.ts
│   │   │   └── recommendation.module.ts
│   │   └── user/                   # 用户管理模块
│   │
│   └── decorators/                 # 自定义装饰器
│       └── public.decorator.ts
│
├── frontend/src/
│   ├── pages/                      # 页面组件
│   │   ├── Customer/
│   │   ├── Recommendation/
│   │   └── Dashboard/
│   ├── components/                 # 通用组件
│   ├── services/                   # API 服务层
│   ├── utils/                      # 工具函数
│   └── hooks/                      # 自定义 Hooks
│
├── docs/                           # 项目文档
├── docs-templates/                 # 文档模板仓库
├── test/                           # E2E 测试
└── .github/workflows/              # CI/CD 配置
```

### 2.2 模块组织原则

```typescript
/**
 * 每个业务模块应包含以下文件：
 * 1. xxx.module.ts - 模块定义
 * 2. xxx.controller.ts - 控制器（路由 + 请求处理）
 * 3. xxx.service.ts - 服务层（业务逻辑）
 * 4. entities/ - TypeORM 实体
 * 5. dto/ - 数据传输对象
 */

// ✅ 模块结构示例
@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    CacheModule,
  ],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService], // 如果其他模块需要
})
export class CustomerModule {}
```

---

## 💬 三、代码注释规范

### 3.1 文件头注释

```typescript
/**
 * 客户服务模块
 * 提供客户 CRUD、RFM 分析、批量操作等功能
 * 
 * @author AI Assistant
 * @since 2026-03-30
 */
```

### 3.2 函数/方法注释

```typescript
/**
 * 为客户生成推荐标签
 * 
 * @param customerId - 客户 ID
 * @param options - 推荐选项
 * @param options.mode - 引擎模式：rule|clustering|association|all
 * @param options.useCache - 是否使用缓存，默认 true
 * @returns 推荐标签数组
 * 
 * @throws NotFoundException - 客户不存在时抛出
 * @throws InternalServerErrorException - 引擎执行失败时抛出
 * 
 * @example
 * // 调用示例
 * const recommendations = await service.generateForCustomer(123, {
 *   mode: 'all',
 *   useCache: true
 * });
 */
async generateForCustomer(
  customerId: number,
  options: RecommendOptions = {}
): Promise<TagRecommendation[]> {
  // ...
}
```

### 3.3 类注释

```typescript
/**
 * 推荐服务类
 * 负责协调四大引擎（规则/聚类/关联/融合）的调用与结果处理
 * 
 * @description
 * 支持单引擎模式和全引擎模式，通过 FusionEngine 实现结果融合
 * 
 * @usage
 * ```typescript
 * const recommendations = await recommendationService.generateForCustomer(123);
 * ```
 */
@Injectable()
export class RecommendationService {
  // ...
}
```

### 3.4 行内注释

```typescript
// ✅ 好注释：解释 WHY，而非 WHAT
// 使用 K-Means++ 初始化质心，避免陷入局部最优
const centroids = initializeCentroidsPlusPlus(data, k);

// ❌ 坏注释：重复代码语义
// 循环遍历所有客户
for (const customer of customers) {  // 代码已经很清楚了
}
```

---

## 🔧 四、Git 提交规范

### 4.1 Commit Message 格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 4.2 Type 类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(recommendation): 新增关联规则引擎` |
| `fix` | Bug 修复 | `fix(cache): 修复缓存命中率计算错误` |
| `docs` | 文档更新 | `docs: 更新 API 文档` |
| `style` | 代码格式（不影响功能） | `style: 格式化代码` |
| `refactor` | 重构（非新功能/非 Bug 修复） | `refactor(customer): 提取 RFM 逻辑到独立服务` |
| `test` | 测试相关 | `test: 添加单元测试用例` |
| `chore` | 构建/工具/配置 | `chore: 更新依赖版本` |

### 4.3 Scope 范围

使用受影响的模块名称：
- `customer` - 客户管理
- `recommendation` - 推荐引擎
- `cache` - 缓存模块
- `auth` - 认证授权
- `database` - 数据库相关
- `frontend` - 前端相关

### 4.4 Subject 主题

- 使用祈使句现在时（"add" 而非 "added" 或 "adds"）
- 首字母小写
- 不超过 50 个字符
- 不加句号

### 4.5 Body 正文（可选）

详细描述变更动机和对比：

```markdown
body: 详细说明为什么做这个改动，而不是做什么

之前的行为：...
现在的行为：...
```

### 4.6 Footer 页脚（可选）

用于引用 Issue 或 BREAKING CHANGE：

```markdown
BREAKING CHANGE: API 路径从 /v1/customers 改为 /v2/customers

Closes: #123, #456
Refs: #789
```

### 4.7 完整示例

```bash
# 新功能
feat(recommendation): 实现关联规则挖掘引擎

- 使用 Apriori 算法挖掘频繁项集
- 支持置信度、提升度过滤
- 添加最小支持度阈值配置

Closes: #45

# Bug 修复
fix(cache): 修复并发场景下缓存击穿问题

使用 Redis SETNX 实现分布式锁，防止缓存失效瞬间大量请求打到数据库

之前：多个请求同时查询会穿透到数据库
现在：只有一个请求查询数据库，其他等待缓存写入

Fixes: #78

# 重构
refactor(customer): 将 RFM 逻辑提取为独立服务

提高代码复用性，便于在其他模块中使用 RFM 分析

Before:
RFM 逻辑耦合在 CustomerService 中

After:
独立的 RfmAnalysisService，可注入到其他服务

# 文档
docs: 完善推荐引擎架构文档

- 添加四大引擎关系图
- 补充 API 使用示例
- 增加性能对比表格
```

---

## 🎨 五、TypeScript 编码规范

### 5.1 类型注解

```typescript
// ✅ 优先使用类型推断
const name = '张三';  // 自动推断为 string
const list = [1, 2, 3];  // 推断为 number[]

// ✅ 必要时显式声明
const data: any = getData();  // 明确标注 any
let count: number | null = null;  // 联合类型

// ❌ 避免过度推断导致类型不安全
const users = [];  // 推断为 never[]
users.push({ name: '李四' });  // Error!
```

### 5.2 接口与类型别名

```typescript
// ✅ 优先使用 interface 定义对象类型
interface Customer {
  id: number;
  name: string;
  level?: CustomerLevel;  // 可选属性
}

// ✅ 使用 type 定义联合类型或复杂类型
type EngineMode = 'rule' | 'clustering' | 'association' | 'all';
type RecommendationResult = CreateRecommendationDto & { timestamp: number };

// ✅ 使用 extends 继承接口
interface VipCustomer extends Customer {
  totalAssets: number;
  creditScore: number;
}
```

### 5.3 泛型使用

```typescript
// ✅ 泛型约束
function identity<T extends object>(arg: T): T {
  return arg;
}

// ✅ 使用泛型工具类型
type PartialCustomer = Partial<Customer>;
type ReadonlyCustomer = Readonly<Customer>;
type CustomerKeys = keyof Customer;
```

### 5.4 异步编程

```typescript
// ✅ 优先使用 async/await
async function getCustomer(id: number): Promise<Customer> {
  const customer = await this.repository.findOne({ where: { id } });
  if (!customer) {
    throw new NotFoundException(`Customer ${id} not found`);
  }
  return customer;
}

// ✅ 并行执行使用 Promise.all
async function getAllCustomers(): Promise<Customer[]> {
  const [vipCustomers, normalCustomers] = await Promise.all([
    this.getVipCustomers(),
    this.getNormalCustomers(),
  ]);
  return [...vipCustomers, ...normalCustomers];
}

// ❌ 避免回调地狱
getData((err, data) => {
  if (err) handleError(err);
  processData(data, (result) => {
    saveData(result, () => {
      // ...
    });
  });
});
```

---

## 🧪 六、测试代码规范

### 6.1 测试文件命名

```bash
# ✅ 正确示例
customer.service.spec.ts
cache.interceptor.spec.ts
recommendation.controller.e2e-spec.ts

# ❌ 错误示例
test_customer.ts
customer_test.ts
```

### 6.2 测试套件结构

```typescript
describe('CustomerService', () => {
  let service: CustomerService;
  let mockRepository: MockType<Repository<Customer>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: 'CUSTOMER_REPOSITORY', useFactory: repositoryMockFactory },
      ],
    }).compile();

    service = module.get(CustomerService);
    mockRepository = module.get('CUSTOMER_REPOSITORY');
  });

  describe('findAll', () => {
    it('should return an array of customers with pagination', async () => {
      // Arrange
      const mockCustomers = [{ id: 1, name: '张三' }];
      mockRepository.find.mockResolvedValue(mockCustomers);

      // Act
      const result = await service.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(mockRepository.find).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should handle empty result', async () => {
      // ...
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      // ...
    });

    it('should throw NotFoundException when customer not found', async () => {
      // ...
    });
  });
});
```

### 6.3 测试断言规范

```typescript
// ✅ 使用具体的匹配器
expect(result.success).toBe(true);
expect(result.data).toHaveLength(5);
expect(result.total).toBeGreaterThan(0);
expect(mockFunction).toHaveBeenCalledTimes(1);

// ❌ 避免模糊匹配
expect(result).toBeTruthy();  // 太宽泛
expect(result).toEqual(expect.anything());  // 无意义
```

### 6.4 Mock 数据规范

```typescript
// ✅ 使用工厂函数创建 Mock 数据
function createMockCustomer(overrides?: Partial<Customer>): Customer {
  return {
    id: 1,
    name: '测试客户',
    level: 'GOLD',
    totalAssets: 1000000,
    riskLevel: 'LOW',
    isActive: true,
    ...overrides,
  };
}

// 使用示例
const vipCustomer = createMockCustomer({
  level: 'DIAMOND',
  totalAssets: 10000000,
});
```

---

## 🚀 七、性能优化规范

### 7.1 数据库查询优化

```typescript
// ✅ 使用索引字段查询
async findByLevel(level: CustomerLevel): Promise<Customer[]> {
  return this.repository.find({
    where: { level },  // level 字段有索引
  });
}

// ✅ 使用 SELECT 指定字段
async getCustomerNames(): Promise<string[]> {
  const customers = await this.repository.find({
    select: ['name'],  // 只查询需要的字段
  });
  return customers.map(c => c.name);
}

// ✅ 使用 JOIN 避免 N+1 查询
async getCustomersWithTags(): Promise<any[]> {
  return this.repository
    .createQueryBuilder('customer')
    .leftJoinAndSelect('customer.tags', 'tag')  // 一次查询关联数据
    .getMany();
}

// ❌ 避免 N+1 查询
const customers = await this.repository.find();
for (const customer of customers) {
  customer.tags = await this.tagRepository.findByCustomerId(customer.id);  // N 次查询
}
```

### 7.2 缓存使用规范

```typescript
// ✅ 热点数据必须缓存
@Cacheable({ ttl: 3600, prefix: 'customer' })
async findOne(id: number): Promise<Customer> {
  return this.repository.findOne({ where: { id } });
}

// ✅ 使用 getOrSet 模式
async getCustomerStatistics(): Promise<Stats> {
  return this.cacheService.getOrSet(
    'stats:customer:daily',
    async () => {
      // 耗时计算逻辑
      return this.calculateStatistics();
    },
    { ttl: 86400 }  // 24 小时
  );
}

// ✅ 批量操作后清理缓存
async batchUpdate(ids: number[], data: UpdateCustomerDto): Promise<void> {
  await this.repository.update(ids, data);
  // 清理相关缓存
  await this.cacheService.deleteBatch(
    ids.map(id => `customer:${id}`)
  );
}
```

### 7.3 大数据量处理

```typescript
// ✅ 使用流式处理
async exportLargeDataset(): Promise<Readable> {
  return this.repository
    .createQueryBuilder('customer')
    .stream();  // 流式查询，避免内存溢出
}

// ✅ 分批处理
async processAllCustomers(): Promise<void> {
  const batchSize = 100;
  let page = 1;
  
  while (true) {
    const customers = await this.repository.find({
      skip: (page - 1) * batchSize,
      take: batchSize,
    });
    
    if (customers.length === 0) break;
    
    await Promise.all(
      customers.map(customer => this.processSingle(customer))
    );
    
    page++;
  }
}
```

---

## 🔒 八、安全编码规范

### 8.1 输入验证

```typescript
// ✅ 使用 class-validator 装饰器
export class CreateCustomerDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(0)
  @Max(1000000000)
  totalAssets: number;

  @IsEnum(CustomerLevel)
  level?: CustomerLevel;
}

// ❌ 禁止直接拼接 SQL
async findByName(name: string): Promise<Customer> {
  // 危险！SQL 注入风险
  return this.repository.query(`SELECT * FROM customers WHERE name = '${name}'`);
}
```

### 8.2 敏感数据处理

```typescript
// ✅ 密码加密存储
import * as bcrypt from 'bcrypt';

async hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ✅ 响应中脱敏
transform(customer: Customer): any {
  return {
    id: customer.id,
    name: customer.name,
    // 不返回敏感字段
    // password: undefined,
    // idCard: undefined,
  };
}
```

### 8.3 权限控制

```typescript
// ✅ 使用 Guard 进行权限校验
@UseGuards(JwtAuthGuard, RolesGuard)
@RolesAllowed('ADMIN')
@Delete(':id')
async remove(@Param('id') id: number): Promise<void> {
  return this.customerService.remove(id);
}

// ✅ 检查资源所有权
async updateCustomer(
  customerId: number,
  userId: number,
  dto: UpdateCustomerDto
): Promise<Customer> {
  const customer = await this.findOne(customerId);
  
  // 验证是否属于当前用户
  if (customer.userId !== userId) {
    throw new ForbiddenException('无权修改此客户');
  }
  
  return this.repository.save({ ...customer, ...dto });
}
```

---

## 📊 九、代码质量指标

### 9.1 圈复杂度

```typescript
// ✅ 低复杂度：单一职责
function calculateDiscount(customer: Customer): number {
  if (customer.level === 'DIAMOND') return 0.2;
  if (customer.level === 'GOLD') return 0.15;
  if (customer.level === 'SILVER') return 0.1;
  return 0;
}

// ❌ 高复杂度：嵌套过深
function processOrder(order: Order): void {
  if (order.status === 'PENDING') {
    if (order.customer) {
      if (order.customer.level === 'VIP') {
        if (order.total > 1000) {
          // ... 深层嵌套
        }
      }
    }
  }
}
```

### 9.2 函数长度

```typescript
// ✅ 短函数：< 50 行
async validateCustomer(customer: Customer): Promise<boolean> {
  const checks = [
    () => this.validateBasicInfo(customer),
    () => this.validateContact(customer),
    () => this.validateFinancial(customer),
  ];
  
  const results = await Promise.all(checks.map(fn => fn()));
  return results.every(result => result);
}

// ❌ 长函数：> 100 行（应拆分）
async processCustomerData(customer: Customer): Promise<Result> {
  // 500 行代码... 应该拆分为多个小函数
}
```

### 9.3 类大小

```typescript
// ✅ 小型类：< 300 行
@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly repository: Repository<Customer>,
    private readonly cacheService: CacheService,
  ) {}
  
  // 专注于客户相关业务逻辑
}

// ❌ 巨型类：> 500 行（应拆分）
@Injectable()
export class GodClassService {
  // 包含客户、订单、支付、物流... 所有逻辑
}
```

---

## 🛠️ 十、工具与自动化

### 10.1 ESLint 配置

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
  },
};
```

### 10.2 Prettier 配置

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

### 10.3 Husky + Commitlint

```javascript
// .husky/commit-msg
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"
npx commitlint --edit $1
```

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
    ],
  },
};
```

---

## 📈 十一、持续改进

### 11.1 代码审查清单

在提交代码前自检：

- [ ] 遵循命名规范
- [ ] 添加了必要的 JSDoc 注释
- [ ] 函数长度 < 50 行
- [ ] 类长度 < 300 行
- [ ] 无重复代码（DRY 原则）
- [ ] 已添加单元测试
- [ ] 测试覆盖率达标（Statements >= 30%）
- [ ] Git 提交信息符合规范
- [ ] 无 ESLint 警告
- [ ] 已通过 Prettier 格式化

### 11.2 技术债务管理

发现以下情况时应记录到技术债务清单：

```markdown
# 技术债务登记簿

## TD-001: N+1 查询问题
**位置**: `recommendation.service.ts:123`  
**问题**: 循环内查询数据库，性能差  
**影响**: 1000 个客户需查询 1001 次  
**优先级**: P1  
**解决方案**: 使用 JOIN 或批量查询  

## TD-002: 硬编码配置
**位置**: `cache.service.ts:45`  
**问题**: TTL 值硬编码为 3600  
**影响**: 修改需重新编译  
**优先级**: P2  
**解决方案**: 移至配置文件或环境变量
```

---

## 📚 十二、参考资源

### 12.1 官方文档

- [NestJS 最佳实践](https://docs.nestjs.com/techniques/performance)
- [TypeScript 编码规范](https://google.github.io/styleguide/tsguide.html)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)

### 12.2 推荐阅读

- 《代码整洁之道》(Clean Code)
- 《重构：改善既有代码的设计》
- 《设计模式：可复用面向对象软件的基础》

---

**文档版本**: v1.0  
**编制日期**: 2026-03-30  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
