# 项目开发技能库

**版本**: 1.0  
**更新时间**: 2026-03-26  
**目标**: 提升团队开发效率和质量

---

## 📚 技能目录

### 核心技能

1. **[NestJS 服务开发](#skill-1-nestjs 服务开发)** - Service 层最佳实践
2. **[TypeORM 数据访问](#skill-2-typeorm 数据访问)** - 数据库操作规范
3. **[Redis 缓存优化](#skill-3-redis 缓存优化)** - 高性能缓存策略
4. **[算法实现](#skill-4-算法实现)** - 推荐算法开发
5. **[错误处理](#skill-5-错误处理)** - 统一异常管理
6. **[日志记录](#skill-6-日志记录)** - 结构化日志
7. **[单元测试](#skill-7-单元测试)** - 测试驱动开发
8. **[代码重构](#skill-8-代码重构)** - 代码质量提升

---

## Skill 1: NestJS 服务开发

### 技能描述
掌握 NestJS Service 层的标准开发模式，包括依赖注入、生命周期、异常处理等。

### 学习路径

#### Level 1: 基础
```typescript
// ✅ 标准 Service 模板
@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  constructor(
    @InjectRepository(Entity)
    private readonly repo: Repository<Entity>,
  ) {}

  async findById(id: number): Promise<Entity | null> {
    this.logger.debug(`Finding entity by id: ${id}`);
    
    const entity = await this.repo.findOne({ where: { id } });
    
    if (!entity) {
      this.logger.warn(`Entity not found: ${id}`);
      throw new NotFoundException(`Entity ${id} not found`);
    }
    
    return entity;
  }
}
```

#### Level 2: 进阶 - 事务处理
```typescript
@Transaction()
async createWithRelations(
  createDto: CreateEntityDto,
  relations: Relation[]
): Promise<Entity> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const entity = queryRunner.manager.create(Entity, createDto);
    await queryRunner.manager.save(entity);

    for (const relation of relations) {
      await queryRunner.manager.insert(RelationEntity, {
        entityId: entity.id,
        ...relation,
      });
    }

    await queryRunner.commitTransaction();
    return entity;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    this.logger.error('Transaction failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

#### Level 3: 高级 - 性能优化
```typescript
async batchProcess(ids: number[]): Promise<Result[]> {
  // 使用 QueryBuilder 优化查询
  const entities = await this.repo
    .createQueryBuilder('entity')
    .where('entity.id IN (:...ids)', { ids })
    .leftJoinAndSelect('entity.relations', 'relations')
    .getMany();

  // 并行处理
  const results = await Promise.all(
    entities.map(entity => this.processEntity(entity))
  );

  return results;
}
```

### 实战练习
1. 创建一个包含 CRUD 操作的完整 Service
2. 实现事务处理的业务逻辑
3. 添加缓存优化查询性能

### 参考文件
- `src/modules/recommendation/recommendation.service.ts`
- `src/modules/scoring/scoring.service.ts`

---

## Skill 2: TypeORM 数据访问

### 技能描述
熟练掌握 TypeORM 的各种查询方式，包括 Repository、QueryBuilder、原生 SQL 等。

### 核心技术

#### 1. Repository 基础查询
```typescript
// 基本查询
const entities = await this.repo.find({
  where: { status: 'active' },
  relations: ['creator', 'tags'],
  order: { createdAt: 'DESC' },
  take: 10,
  skip: 0,
});

// 条件查询
const entities = await this.repo.find({
  where: [
    { status: 'active', priority: MoreThan(5) },
    { status: 'urgent' },
  ],
});
```

#### 2. QueryBuilder 高级查询
```typescript
const result = await this.repo
  .createQueryBuilder('entity')
  .select([
    'entity.id',
    'entity.name',
    'COUNT(relations.id)',
    'AVG(scores.value)',
  ])
  .leftJoin('entity.relations', 'relations')
  .leftJoin('entity.scores', 'scores')
  .where('entity.status = :status', { status: 'active' })
  .andWhere('entity.createdAt >= :date', { 
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
  })
  .groupBy('entity.id')
  .having('COUNT(relations.id) > :count', { count: 5 })
  .orderBy('AVG(scores.value)', 'DESC')
  .limit(100)
  .getRawAndEntities();
```

#### 3. 性能优化技巧
```typescript
// ✅ 好的做法 - 只选择需要的字段
const entities = await this.repo
  .createQueryBuilder('entity')
  .select(['entity.id', 'entity.name', 'entity.status'])
  .where('entity.id = :id', { id: 123 })
  .getOne();

// ❌ 不好的做法 - 选择所有字段
const entity = await this.repo.findOne({ where: { id: 123 } });

// 使用索引提示
const entities = await this.repo
  .createQueryBuilder('entity')
  .useIndex('idx_status_created')
  .where('entity.status = :status', { status: 'active' })
  .getMany();
```

### 实战练习
1. 实现一个复杂的多表关联查询
2. 使用 QueryBuilder 优化慢查询
3. 添加数据库索引并测试性能提升

### 参考文件
- `src/database/migrations/` 目录下的迁移文件

---

## Skill 3: Redis 缓存优化

### 技能描述
掌握 Redis 缓存的设计模式，包括缓存策略、过期时间、键命名规范等。

### 缓存模式

#### 1. Cache-Aside Pattern
```typescript
async getRecommendations(customerId: number): Promise<TagRecommendation[]> {
  const cacheKey = `recommendations:${customerId}`;
  
  // 先查缓存
  const cached = await this.cache.get<TagRecommendation[]>(cacheKey);
  if (cached) {
    this.logger.debug(`Cache hit: ${cacheKey}`);
    return cached;
  }
  
  // 查询数据库
  const result = await this.queryDatabase(customerId);
  
  // 写入缓存（设置过期时间）
  await this.cache.set(cacheKey, result, 1800); // 30 分钟
  
  return result;
}
```

#### 2. Write-Through Pattern
```typescript
async updateRecommendation(
  id: number,
  updateDto: UpdateRecommendationDto
): Promise<TagRecommendation> {
  // 更新数据库
  const updated = await this.repo.save({
    id,
    ...updateDto,
  });
  
  // 同步更新缓存
  const cacheKey = `recommendation:${id}`;
  await this.cache.set(cacheKey, updated, 1800);
  
  // 清除列表缓存
  await this.cache.delete(`recommendations:${updated.customerId}`);
  
  return updated;
}
```

#### 3. 缓存预热
```typescript
async warmUpCache(): Promise<void> {
  const activeCustomers = await this.getTopActiveCustomers(100);
  
  await Promise.all(
    activeCustomers.map(async customer => {
      const recommendations = await this.generateForCustomer(customer.id);
      await this.cache.set(
        `recommendations:${customer.id}`,
        recommendations,
        3600
      );
    })
  );
  
  this.logger.log('Cache warmed up for top 100 customers');
}
```

### 键命名规范
```typescript
// 格式：模块：类型：ID:字段
const keys = {
  recommendation: `rec:rec:${id}`,
  customerRecommendations: `rec:cust:${customerId}`,
  ruleActive: `rule:active:${ruleId}`,
  scoreTag: `score:tag:${tagId}`,
  configClustering: `config:cluster:${configId}`,
};
```

### 实战练习
1. 为推荐服务添加多级缓存
2. 实现缓存预热策略
3. 监控缓存命中率并优化

### 参考文件
- `src/infrastructure/redis/cache.service.ts`

---

## Skill 4: 算法实现

### 技能描述
掌握推荐系统中常用算法的实现，包括规则引擎、聚类、关联规则挖掘等。

### 算法 1: K-Means++ 聚类

```typescript
/**
 * K-Means++ 初始化质心
 * 相比随机初始化，K-Means++ 能提供更好的聚类结果和更快的收敛速度
 */
private initializeCentroids(data: number[][], k: number): number[][] {
  const centroids: number[][] = [];
  const n = data.length;

  // 1. 随机选择第一个质心
  const firstIndex = Math.floor(Math.random() * n);
  centroids.push([...data[firstIndex]]);

  // 2. 选择剩余质心
  while (centroids.length < k) {
    // 计算每个点到最近质心的距离平方
    const distances = data.map(point => {
      const minDist = Math.min(
        ...centroids.map(centroid => this.squaredDistance(point, centroid))
      );
      return minDist;
    });

    // 按距离平方比例选择下一个质心
    const totalDistance = distances.reduce((sum, d) => sum + d, 0);
    let random = Math.random() * totalDistance;
    
    for (let i = 0; i < n; i++) {
      random -= distances[i];
      if (random <= 0) {
        if (!centroids.some(c => this.arraysEqual(c, data[i]))) {
          centroids.push([...data[i]]);
        }
        break;
      }
    }
  }

  return centroids;
}
```

### 算法 2: Apriori 关联规则

```typescript
/**
 * Apriori 算法挖掘频繁项集
 * @param transactions 交易数据
 * @param minSupport 最小支持度
 */
async mineFrequentItemSets(
  transactions: string[][],
  minSupport: number
): Promise<FrequentItemSet[]> {
  const n = transactions.length;
  const frequentItemSets: FrequentItemSet[] = [];
  
  // 1. 生成频繁 1-项集
  const itemCounts = new Map<string, number>();
  for (const transaction of transactions) {
    const uniqueItems = new Set(transaction);
    for (const item of uniqueItems) {
      itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
    }
  }
  
  const frequent1: string[][] = [];
  for (const [item, count] of itemCounts.entries()) {
    const support = count / n;
    if (support >= minSupport) {
      frequent1.push([item]);
      frequentItemSets.push({ items: [item], support, count });
    }
  }
  
  // 2. 迭代生成 K-项集
  let prevFrequent = frequent1;
  while (prevFrequent.length > 0) {
    const candidates = this.generateCandidates(prevFrequent);
    const frequentK: string[][] = [];
    
    for (const candidate of candidates) {
      const count = this.countOccurrences(candidate, transactions);
      const support = count / n;
      
      if (support >= minSupport) {
        frequentK.push(candidate);
        frequentItemSets.push({ items: candidate, support, count });
      }
    }
    
    prevFrequent = frequentK;
  }
  
  return frequentItemSets;
}
```

### 算法 3: 规则冲突检测

```typescript
/**
 * 检测两个规则是否存在矛盾
 * 
 * 矛盾类型：
 * 1. 同一字段的互斥条件（age > 30 AND age < 20）
 * 2. 运算符冲突（== 5 AND != 5）
 */
private checkRuleContradiction(
  rule1: RecommendationRule,
  rule2: RecommendationRule
): boolean {
  const conditions1 = this.parseExpression(rule1.ruleExpression);
  const conditions2 = this.parseExpression(rule2.ruleExpression);
  
  for (const cond1 of conditions1) {
    for (const cond2 of conditions2) {
      if (cond1.field === cond2.field) {
        // 检查是否矛盾
        if (this.isContradictory(cond1, cond2)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

private isContradictory(
  cond1: Condition,
  cond2: Condition
): boolean {
  const val1 = parseFloat(cond1.value);
  const val2 = parseFloat(cond2.value);
  
  // > 和 < 的矛盾
  if (cond1.operator === '>' && cond2.operator === '<') {
    return val1 >= val2;
  }
  
  // == 和 != 的矛盾
  if (cond1.operator === '==' && cond2.operator === '!=') {
    return val1 === val2;
  }
  
  return false;
}
```

### 实战练习
1. 实现 K-Means 聚类并可视化结果
2. 使用 Apriori 算法挖掘客户行为关联规则
3. 设计规则冲突检测算法

### 参考文件
- `src/modules/recommendation/engines/clustering-engine.service.ts`
- `src/modules/recommendation/engines/association-engine.service.ts`
- `src/modules/recommendation/services/conflict-detector.service.ts`

---

## Skill 5: 错误处理

### 技能描述
掌握统一的异常处理机制，包括自定义异常、异常过滤器、错误码规范等。

### 异常层次结构

```typescript
// 基础异常类
export abstract class BaseException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    public readonly errorCode: string,
    public readonly context?: string,
  ) {
    super(
      {
        statusCode,
        message,
        errorCode,
        context,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

// 业务异常
export class BusinessException extends BaseException {
  constructor(
    message: string,
    errorCode: string = 'BUSINESS_ERROR',
    context?: string,
  ) {
    super(message, HttpStatus.BAD_REQUEST, errorCode, context);
  }
}

// 资源不存在
export class ResourceNotFoundException extends BaseException {
  constructor(resource: string, id: string | number) {
    super(
      `${resource} with id ${id} not found`,
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
    );
  }
}
```

### 全局异常过滤器

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getMessage()
      : 'Internal server error';

    // 记录错误日志
    this.logger.error(
      `Error: ${message}`,
      {
        path: request.url,
        method: request.method,
        ip: request.ip,
        stack: exception instanceof Error ? exception.stack : undefined,
      },
    );

    // 返回统一格式的错误响应
    response.status(status).json({
      statusCode: status,
      message,
      ...(exception instanceof BaseException && {
        errorCode: exception.errorCode,
        context: exception.context,
      }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### 实战练习
1. 创建自定义异常类
2. 实现全局异常过滤器
3. 设计错误码体系

### 参考文件
- `src/common/filters/all-exceptions.filter.ts`（需创建）

---

## Skill 6: 日志记录

### 技能描述
掌握结构化日志记录方法，包括日志级别、上下文信息、性能日志等。

### 日志级别使用指南

```typescript
// DEBUG - 详细调试信息（生产环境关闭）
this.logger.debug(`Processing rule ${rule.id}: ${rule.ruleExpression}`);

// LOG - 正常业务流程
this.logger.log(`Generated ${count} recommendations for customer ${customerId}`);

// WARN - 警告但不影响流程
this.logger.warn(`Low confidence (${confidence}) for rule ${rule.name}`);

// ERROR - 错误需要关注
this.logger.error('Failed to connect to database:', error, 'DatabaseConnection');
```

### 结构化日志

```typescript
interface LogContext {
  customerId?: number;
  recommendationId?: number;
  duration?: number;
  action: string;
  result: 'success' | 'failure';
  metadata?: Record<string, any>;
}

logAction(context: LogContext): void {
  const logMessage = `[${context.action}] ${context.result} ` +
    `${context.customerId ? `customer=${context.customerId}` : ''}`;
  
  if (context.result === 'success') {
    this.logger.log(logMessage, context.metadata);
  } else {
    this.logger.error(logMessage, context.metadata);
  }
}

// 使用示例
this.logAction({
  customerId: 123,
  action: 'generate_recommendations',
  result: 'success',
  duration: 245,
  metadata: {
    recommendationCount: 5,
    sources: ['rule', 'clustering'],
  },
});
```

### 性能日志

```typescript
async measurePerformance<T>(
  action: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    this.logger.log(`[${action}] Completed in ${duration}ms`);
    
    // 如果超过阈值，记录警告
    if (duration > 1000) {
      this.logger.warn(`[${action}] Slow execution: ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    this.logger.error(
      `[${action}] Failed after ${duration}ms: ${error.message}`,
    );
    throw error;
  }
}

// 使用示例
return await this.measurePerformance('generate_recommendations', async () => {
  return await this.generateForCustomer(customerId);
});
```

### 实战练习
1. 为现有服务添加完整的日志记录
2. 实现性能监控日志
3. 配置日志聚合工具

### 参考文件
- `src/common/logger/http-logger.middleware.ts`

---

## Skill 7: 单元测试

### 技能描述
掌握测试驱动开发（TDD）方法，包括单元测试、集成测试、Mock 技术等。

### 单元测试模板

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RuleEngineService } from './rule-engine.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecommendationRule } from '../entities/recommendation-rule.entity';

describe('RuleEngineService', () => {
  let service: RuleEngineService;
  let mockRepo: Partial<getRepositoryToken(RecommendationRule)>;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleEngineService,
        {
          provide: getRepositoryToken(RecommendationRule),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<RuleEngineService>(RuleEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadActiveRules', () => {
    it('should return active rules ordered by priority', async () => {
      // Arrange
      const mockRules = [
        { id: 1, ruleName: 'Rule 1', priority: 90, isActive: true },
        { id: 2, ruleName: 'Rule 2', priority: 95, isActive: true },
      ];
      mockRepo.find.mockResolvedValue(mockRules);

      // Act
      const result = await service.loadActiveRules();

      // Assert
      expect(result).toEqual(mockRules);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { priority: 'DESC' },
      });
    });
  });

  describe('generateRecommendations', () => {
    it('should return empty array when no rules match', async () => {
      // Arrange
      const customer = createMockCustomer();
      mockRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.generateRecommendations(customer);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return recommendations when rules match', async () => {
      // Arrange
      const customer = createMockCustomer({ totalAssets: 1000000 });
      const mockRules = [createMockRule()];
      mockRepo.find.mockResolvedValue(mockRules);

      // Act
      const result = await service.generateRecommendations(customer);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('tagName');
      expect(result[0]).toHaveProperty('confidence');
    });
  });
});

// Helper functions
function createMockCustomer(overrides = {}) {
  return {
    id: 1,
    totalAssets: 500000,
    monthlyIncome: 20000,
    // ... other fields
    ...overrides,
  };
}

function createMockRule(overrides = {}) {
  return {
    id: 1,
    ruleName: 'Test Rule',
    ruleExpression: 'totalAssets >= 500000',
    priority: 80,
    tagTemplate: { name: 'High Value', category: 'Value', baseConfidence: 0.8 },
    isActive: true,
    ...overrides,
  };
}
```

### 测试覆盖率要求

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};
```

### 实战练习
1. 为 RuleEngineService 编写完整的单元测试
2. 实现集成测试验证 API 端点
3. 达到 80% 以上的测试覆盖率

### 参考文件
- `jest.config.js`
- `src/modules/recommendation/engines/rule-engine.service.spec.ts`（需创建）

---

## Skill 8: 代码重构

### 技能描述
掌握代码重构技巧，持续改进代码质量，包括提取方法、消除重复、优化结构等。

### 重构模式

#### 1. 提取方法（Extract Method）

**重构前**:
```typescript
async generateRecommendations(customer: CustomerData): Promise<Recommendation[]> {
  const rules = await this.ruleRepo.find({ where: { isActive: true } });
  const recommendations: Recommendation[] = [];
  
  for (const rule of rules) {
    const condition = rule.ruleExpression.split(/\s+AND\s+/i);
    let matched = true;
    
    for (const cond of condition) {
      const parts = cond.match(/^(\w+)\s*(>=|<=|!=|==|>|<)\s*(.+)$/);
      if (parts) {
        const fieldValue = customer[parts[1]];
        if (!this.evaluateCondition(fieldValue, parts[2], parts[3])) {
          matched = false;
          break;
        }
      }
    }
    
    if (matched) {
      recommendations.push({
        tagName: rule.tagTemplate.name,
        confidence: this.calculateConfidence(rule),
        source: 'rule',
      });
    }
  }
  
  return recommendations;
}
```

**重构后**:
```typescript
async generateRecommendations(customer: CustomerData): Promise<Recommendation[]> {
  const rules = await this.loadActiveRules();
  const recommendations: Recommendation[] = [];
  
  for (const rule of rules) {
    if (await this.evaluateRule(rule, customer)) {
      recommendations.push(this.createRecommendation(rule));
    }
  }
  
  return recommendations;
}

private async evaluateRule(rule: RecommendationRule, customer: CustomerData): Promise<boolean> {
  const conditions = this.parseCondition(rule.ruleExpression);
  return conditions.every(cond => this.evaluateCondition(cond, customer));
}

private createRecommendation(rule: RecommendationRule): Recommendation {
  return {
    tagName: rule.tagTemplate.name,
    confidence: this.calculateConfidence(rule),
    source: 'rule',
    reason: `规则匹配：${rule.ruleName}`,
  };
}
```

#### 2. 消除重复代码（Remove Duplicate Code）

**识别重复**:
```typescript
// 在多个服务中都有类似的缓存逻辑
const cached = await this.cache.get(key);
if (cached) {
  return cached;
}
const result = await this.queryDatabase();
await this.cache.set(key, result, 1800);
return result;
```

**提取为装饰器**:
```typescript
export function Cacheable(keyPattern: string, ttl: number = 1800) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const key = this.buildCacheKey(keyPattern, args);
      
      const cached = await this.cache.get(key);
      if (cached) {
        return cached;
      }
      
      const result = await originalMethod.apply(this, args);
      await this.cache.set(key, result, ttl);
      
      return result;
    };
    
    return descriptor;
  };
}

// 使用
@Cacheable('recommendations:${0}', 1800)
async getRecommendations(customerId: number): Promise<TagRecommendation[]> {
  return await this.queryDatabase(customerId);
}
```

### 重构检查清单

- [ ] 方法是否超过 50 行？
- [ ] 是否有重复代码？
- [ ] 变量命名是否清晰？
- [ ] 是否有未使用的代码？
- [ ] 异常处理是否完善？
- [ ] 是否有合适的注释？
- [ ] 测试是否覆盖？

### 实战练习
1. 对现有代码进行重构，提取公共方法
2. 识别并消除重复代码
3. 优化复杂的条件判断逻辑

### 参考文件
- 所有已实现的 Engine Service 都是重构的范例

---

## 技能评估矩阵

| 技能 | 初级 | 中级 | 高级 | 专家 |
|------|------|------|------|------|
| NestJS 服务开发 | ✓ | | | |
| TypeORM 数据访问 | ✓ | | | |
| Redis 缓存优化 | ✓ | | | |
| 算法实现 | | ✓ | | |
| 错误处理 | ✓ | | | |
| 日志记录 | ✓ | | | |
| 单元测试 | | ✓ | | |
| 代码重构 | | ✓ | | |

---

## 学习资源

### 官方文档
- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Redis Documentation](https://redis.io/documentation)

### 书籍推荐
- 《深入浅出 NestJS》
- 《设计模式：可复用面向对象软件的基础》
- 《重构：改善既有代码的设计》
- 《测试驱动开发》

### 在线课程
- NestJS 从零到一
- TypeScript 高级特性
- 微服务架构实战

---

**维护者**: 开发团队  
**最后更新**: 2026-03-26  
**反馈**: 欢迎提交 PR 改进技能文档
