# 客户标签系统 - 开发规范总结

**版本**: 1.0  
**更新时间**: 2026-03-26  
**基于**: Phase 2 核心功能实现经验总结

---

## 📋 目录

1. [代码结构规范](#代码结构规范)
2. [命名规范](#命名规范)
3. [注释规范](#注释规范)
4. [错误处理规范](#错误处理规范)
5. [日志规范](#日志规范)
6. [测试规范](#测试规范)
7. [Git 提交规范](#git 提交规范)
8. [架构设计规范](#架构设计规范)

---

## 代码结构规范

### 1. 服务类结构

**规则**: 每个 Service 应按照以下顺序组织代码

```typescript
@Injectable()
export class ExampleService {
  // 1. Logger 声明
  private readonly logger = new Logger(ExampleService.name);

  // 2. 构造函数注入依赖
  constructor(
    @InjectRepository(Entity)
    private readonly repo: Repository<Entity>,
    private readonly otherService: OtherService,
  ) {}

  // 3. 公共方法（按业务逻辑重要性排序）
  async mainBusinessMethod(): Promise<Result> {
    // 实现
  }

  // 4. 私有辅助方法（按调用关系排序）
  private helperMethod1(): void {}
  private helperMethod2(): void {}

  // 5. 工具方法
  private utilityMethod(): void {}
}
```

**示例参考**: `src/modules/recommendation/engines/rule-engine.service.ts`

### 2. 接口定义位置

**规则**:
- DTO 接口：与 entity 同文件或单独 `dto/` 目录
- 内部接口：放在使用它的 service 文件顶部
- 公共接口：放在 `interfaces/` 目录

```typescript
// ✅ 好的做法 - Service 文件顶部
interface InternalResult {
  success: boolean;
  data?: any;
  error?: string;
}

@Injectable()
export class MyService {
  // 使用 InternalResult
}
```

### 3. 方法长度控制

**规则**: 
- 单个方法不超过 **50 行**
- 超过 30 行应考虑拆分
- 单一职责原则

```typescript
// ❌ 不好的做法 - 方法过长
async generateRecommendations(customer: CustomerData): Promise<Recommendation[]> {
  // 100 行代码...
}

// ✅ 好的做法 - 拆分为小方法
async generateRecommendations(customer: CustomerData): Promise<Recommendation[]> {
  const rules = await this.loadActiveRules();
  const evaluated = await this.evaluateRules(rules, customer);
  const filtered = this.filterByConfidence(evaluated);
  return this.formatResults(filtered);
}
```

---

## 命名规范

### 1. 类命名

```typescript
// Service 类
export class RecommendationService {}
export class RuleEngineService {}

// Entity 类
export class TagRecommendation {}
export class RecommendationRule {}

// DTO/Interface
export interface CreateRecommendationDto {}
export interface CustomerData {}
```

### 2. 方法命名

```typescript
// 业务操作方法 - 动词开头
async generateRecommendations() {}
async evaluateRule() {}
async calculateScore() {}

// Getter 方法 - get 开头
async getCustomerInfo() {}
async getStats() {}

// Setter 方法 - set/update 开头
async updateConfiguration() {}
async setWeights() {}

// 布尔返回 - is/has/should 开头
isActive(): boolean {}
hasConflicts(): boolean {}
shouldRetry(): boolean {}
```

### 3. 变量命名

```typescript
// 集合用复数
const recommendations: Recommendation[] = [];
const rules: RecommendationRule[] = [];

// 单个对象用单数
const recommendation: RecommendationDto;
const rule: RecommendationRule;

// Map/Set 等明确类型
const customerMap = new Map<number, Customer>();
const tagSet = new Set<string>();
```

---

## 注释规范

### 1. 方法注释

**规则**: 所有公共方法必须有 JSDoc 注释

```typescript
/**
 * 为客户生成推荐标签
 * 
 * @param customerId - 客户 ID
 * @param options - 推荐选项配置
 * @param customerData - 客户数据（可选，不提供则使用模拟数据）
 * @returns 推荐标签列表
 * 
 * @example
 * ```typescript
 * const recommendations = await service.generateForCustomer(123, {
 *   mode: 'all',
 *   useCache: true
 * });
 * ```
 */
async generateForCustomer(
  customerId: number,
  options?: RecommendOptions,
  customerData?: CustomerData
): Promise<TagRecommendation[]> {
  // 实现
}
```

### 2. 复杂逻辑注释

**规则**: 算法、业务规则等复杂逻辑必须添加行内注释

```typescript
// ✅ 好的做法
/**
 * 计算置信度
 * 
 * 计算逻辑：
 * 1. 基础置信度来自规则配置
 * 2. 根据优先级调整：
 *    - priority >= 90: +0.15
 *    - priority >= 70: +0.10
 * 3. 上限为 1.0
 */
private calculateConfidence(rule: RecommendationRule): number {
  let confidence = rule.tagTemplate?.baseConfidence || 0.7;

  // 根据优先级调整置信度
  if (rule.priority >= 90) {
    confidence = Math.min(1.0, confidence + 0.15);
  } else if (rule.priority >= 70) {
    confidence = Math.min(1.0, confidence + 0.1);
  }

  return Math.round(confidence * 100) / 100;
}
```

### 3. TODO 注释规范

```typescript
// TODO: [优先级] 描述 - 负责人 - 日期
// TODO: [HIGH] 需要实现真实的客户数据获取 - ZhangSan - 2026-03-26
// FIXME: [CRITICAL] 内存泄漏问题 - LiSi - 2026-03-25
// OPTIMIZE: [MEDIUM] 优化聚类算法性能 - WangWu - 2026-03-24
```

---

## 错误处理规范

### 1. Try-Catch 块使用

**规则**: 所有异步操作必须捕获异常

```typescript
// ✅ 好的做法
async generateRecommendations(customer: CustomerData): Promise<CreateRecommendationDto[]> {
  try {
    const rules = await this.loadActiveRules();
    const results = await this.evaluateRules(rules, customer);
    return this.formatResults(results);
  } catch (error) {
    this.logger.error('Failed to generate recommendations:', error);
    throw new HttpException(
      '推荐生成失败',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

### 2. 自定义异常类

```typescript
// src/common/exceptions/recommendation.exception.ts
export class RecommendationException extends HttpException {
  constructor(message: string, context?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        context,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

// 使用
throw new RecommendationException('规则表达式解析失败', rule.ruleExpression);
```

### 3. 错误码规范

```typescript
export enum ErrorCode {
  // 推荐相关 1000-1999
  RECOMMENDATION_NOT_FOUND = 1001,
  RULE_EVALUATION_FAILED = 1002,
  CLUSTERING_ERROR = 1003,
  
  // 冲突检测 2000-2999
  CONFLICT_DETECTED = 2001,
  RESOLUTION_FAILED = 2002,
}
```

---

## 日志规范

### 1. 日志级别使用

```typescript
// DEBUG - 详细调试信息
this.logger.debug(`Loaded ${rules.length} active rules`);

// LOG - 正常业务流程
this.logger.log(`Rule engine generated ${count} recommendations`);

// WARN - 警告但不影响流程
this.logger.warn(`Detected ${conflicts.length} conflicts`);

// ERROR - 错误需要关注
this.logger.error('Failed to generate recommendations:', error);
```

### 2. 日志格式规范

```typescript
// ✅ 好的做法 - 包含关键上下文信息
this.logger.log(
  `Generated ${recommendations.length} recommendations for customer ${customerId}`,
);

// ❌ 不好的做法 - 信息不完整
this.logger.log('Generated recommendations');
```

### 3. 性能日志

```typescript
async generateRecommendations(customerId: number): Promise<void> {
  const startTime = Date.now();
  
  try {
    // 业务逻辑
    const duration = Date.now() - startTime;
    this.logger.log(`Completed in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    this.logger.error(`Failed after ${duration}ms:`, error);
    throw error;
  }
}
```

---

## 测试规范

### 1. 单元测试结构

```typescript
// src/modules/recommendation/engines/rule-engine.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RuleEngineService } from './rule-engine.service';

describe('RuleEngineService', () => {
  let service: RuleEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleEngineService,
        // Mock dependencies
      ],
    }).compile();

    service = module.get<RuleEngineService>(RuleEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRecommendations', () => {
    it('should return empty array when no rules match', async () => {
      // Arrange
      const customer = createMockCustomer();
      
      // Act
      const result = await service.generateRecommendations(customer);
      
      // Assert
      expect(result).toEqual([]);
    });

    it('should return recommendations when rules match', async () => {
      // 测试用例
    });
  });
});
```

### 2. 测试覆盖率要求

```yaml
# jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### 3. 集成测试规范

```typescript
// test/recommendation.e2e-spec.ts
describe('Recommendation API (e2e)', () => {
  let app: INestApplication;
  
  beforeAll(async () => {
    // 启动测试应用
  });

  afterAll(async () => {
    // 清理资源
  });

  it('/api/v1/recommendations/generate/:customerId (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/recommendations/generate/1')
      .set('Authorization', 'Bearer token')
      .expect(201);
    
    expect(response.body).toHaveProperty('recommendations');
  });
});
```

---

## Git 提交规范

### 1. Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2. Type 类型

```
feat:     新功能
fix:      Bug 修复
docs:     文档更新
style:    代码格式（不影响代码运行）
refactor: 重构（既不是新功能也不是 bug 修复）
test:     测试相关
chore:    构建过程或辅助工具变动
perf:     性能优化
ci:       CI/CD 配置
```

### 3. 完整示例

```bash
feat(recommendation): 实现规则引擎服务

- 添加规则表达式解析器
- 支持 AND/OR 逻辑运算
- 实现 5 种预定义业务规则
- 添加置信度动态调整

Closes #123
```

### 4. 分支管理

```bash
# 主分支
main              # 生产环境
develop           # 开发环境

# 功能分支
feature/recommendation-engine
feature/conflict-detector

# 修复分支
fix/jwt-auth-issue
hotfix/memory-leak

# 发布分支
release/v1.0.0
```

---

## 架构设计规范

### 1. 模块划分原则

```
modules/
├── recommendation/          # 推荐模块
│   ├── engines/            # 核心引擎
│   ├── services/           # 业务服务
│   ├── entities/           # 实体定义
│   ├── dto/               # 数据传输对象
│   └── interfaces/        # 接口定义
├── scoring/               # 评分模块
└── feedback/              # 反馈模块
```

### 2. 依赖注入规范

```typescript
// ✅ 好的做法 - 通过构造函数注入
@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(TagRecommendation)
    private readonly recommendationRepo: Repository<TagRecommendation>,
    private readonly ruleEngine: RuleEngineService,
    private readonly cache: CacheService,
  ) {}
}
```

### 3. 缓存使用规范

```typescript
async getRecommendations(customerId: number): Promise<TagRecommendation[]> {
  // 1. 先查缓存
  const cached = await this.cache.get<TagRecommendation[]>(
    `recommendations:${customerId}`
  );
  if (cached) {
    return cached;
  }

  // 2. 查询数据库
  const result = await this.queryDatabase(customerId);

  // 3. 写入缓存（设置过期时间）
  await this.cache.set(
    `recommendations:${customerId}`,
    result,
    1800 // 30 分钟
  );

  return result;
}
```

### 4. 事务处理规范

```typescript
@Transaction()
async batchGenerate(customerIds: number[]): Promise<number> {
  const successCount = 0;
  
  for (const customerId of customerIds) {
    try {
      await this.generateForCustomer(customerId);
      successCount++;
    } catch (error) {
      this.logger.error(`Failed for customer ${customerId}:`, error);
      // 单个失败不影响其他
    }
  }
  
  return successCount;
}
```

---

## 代码审查清单

### 提交前自查

- [ ] 代码是否遵循命名规范？
- [ ] 方法是否超过 50 行？
- [ ] 是否有完整的注释？
- [ ] 错误处理是否完善？
- [ ] 日志是否包含关键信息？
- [ ] 是否添加了单元测试？
- [ ] 测试覆盖率是否达标？
- [ ] Git commit message 是否规范？

### Code Review 重点

1. **功能正确性**: 代码是否按预期工作？
2. **代码质量**: 是否遵循 SOLID 原则？
3. **性能考虑**: 是否有性能问题？
4. **安全性**: 是否有安全漏洞？
5. **可维护性**: 代码是否易读易懂？
6. **测试覆盖**: 测试是否充分？

---

## 持续改进

### 定期回顾

- 每两周进行一次代码规范回顾
- 收集常见代码问题并更新规范
- 分享最佳实践和反模式案例

### 自动化检查

```json
{
  "scripts": {
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "test:cov": "jest --coverage",
    "precommit": "lint-staged"
  }
}
```

---

## 附录：快速参考卡片

### 常用命令

```bash
# 开发
npm run start:dev      # 热重载开发
npm run build          # 编译构建
npm run lint           # 代码检查
npm run format         # 代码格式化

# 测试
npm run test           # 运行测试
npm run test:cov       # 覆盖率报告
npm run test:e2e       # 端到端测试

# Git
git commit -m "feat: add new feature"  # 提交
git log --oneline                          # 查看历史
```

### 项目结构速查

```
src/
├── common/           # 公共组件
├── modules/          # 业务模块
├── infrastructure/   # 基础设施
└── database/         # 数据库相关
```

---

**最后更新**: 2026-03-26  
**维护者**: 开发团队  
**反馈**: 请在 PR 中提出改进建议
