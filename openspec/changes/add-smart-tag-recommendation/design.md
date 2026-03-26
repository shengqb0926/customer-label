# 设计文档：客户标签智能推荐系统

## 1. 架构设计

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │   Web    │  │  Mobile  │  │   API    │                  │
│  │  Client  │  │   App    │  │  Clients │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        API 网关层                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Gateway / Load Balancer             │   │
│  │         (认证、限流、路由、日志、监控)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       应用服务层                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Tag Service  │  │Recommender   │  │  Scorer      │      │
│  │              │  │  Service     │  │  Service     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Conflict   │  │   Feedback   │                        │
│  │  Detector    │  │   Service    │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       业务逻辑层                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Rule Engine   │  │Clustering    │  │ Association  │      │
│  │              │  │  Engine      │  │   Engine     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Analytics   │  │   Scoring    │                        │
│  │   Engine     │  │   Engine     │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       数据访问层                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   TypeORM    │  │    Redis     │  │    Cache     │      │
│  │   Repository │  │    Client    │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       数据存储层                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │    Redis     │  │   Message    │      │
│  │  (主数据库)  │  │   (缓存)     │  │   Queue      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈选型

#### 后端技术栈
```yaml
runtime:
  name: Node.js
  version: "18.x"
  
language:
  name: TypeScript
  version: "5.0+"
  
framework:
  name: NestJS
  version: "10.x"
  reason: 提供模块化架构、依赖注入、装饰器等企业级特性

orm:
  name: TypeORM
  version: "0.3.x"
  reason: 支持 PostgreSQL 高级特性，类型安全
  
cache:
  name: Redis
  version: "7.x"
  client: ioredis
  
ml:
  - name: TensorFlow.js
    purpose: 聚类和预测算法
  - name: Simple-statistics
    purpose: 基础统计分析
    
queue:
  name: Bull
  purpose: 异步任务队列
  
testing:
  unit: Jest
  e2e: Supertest + Jest
```

#### 前端技术栈
```yaml
framework:
  name: React
  version: "18.x"
  
ui:
  name: Ant Design
  version: "5.x"
  reason: 丰富的企业级组件
  
state:
  name: Zustand
  reason: 轻量级、易用
  
charts:
  name: ECharts
  reason: 强大的数据可视化能力
```

### 1.3 模块划分

```
src/
├── main.ts                          # 应用入口
├── app.module.ts                    # 根模块
│
├── common/                          # 公共模块
│   ├── decorators/                  # 装饰器
│   ├── filters/                     # 异常过滤器
│   ├── interceptors/                # 拦截器
│   ├── guards/                      # 守卫
│   └── pipes/                       # 管道
│
├── config/                          # 配置模块
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── recommender.config.ts
│
├── modules/
│   ├── customer/                    # 客户模块
│   │   ├── customer.module.ts
│   │   ├── customer.controller.ts
│   │   ├── customer.service.ts
│   │   ├── entities/
│   │   │   └── customer.entity.ts
│   │   └── dto/
│   │       └── customer.dto.ts
│   │
│   ├── tag/                         # 标签模块
│   │   ├── tag.module.ts
│   │   ├── tag.controller.ts
│   │   ├── tag.service.ts
│   │   ├── entities/
│   │   │   └── tag.entity.ts
│   │   └── dto/
│   │       └── tag.dto.ts
│   │
│   ├── recommendation/              # 推荐模块（核心）
│   │   ├── recommendation.module.ts
│   │   ├── recommendation.controller.ts
│   │   ├── recommendation.service.ts
│   │   ├── engines/
│   │   │   ├── rule.engine.ts
│   │   │   ├── clustering.engine.ts
│   │   │   └── association.engine.ts
│   │   ├── strategies/
│   │   │   └── fusion.strategy.ts
│   │   └── dto/
│   │       └── recommendation.dto.ts
│   │
│   ├── scoring/                     # 评分模块
│   │   ├── scoring.module.ts
│   │   ├── scoring.service.ts
│   │   ├── scorers/
│   │   │   ├── coverage.scorer.ts
│   │   │   ├── discrimination.scorer.ts
│   │   │   ├── stability.scorer.ts
│   │   │   └── business-value.scorer.ts
│   │   └── dto/
│   │       └── scoring.dto.ts
│   │
│   ├── conflict/                    # 冲突检测模块
│   │   ├── conflict.module.ts
│   │   ├── conflict.service.ts
│   │   ├── detectors/
│   │   │   ├── naming.detector.ts
│   │   │   ├── logical.detector.ts
│   │   │   └── redundancy.detector.ts
│   │   └── dto/
│   │       └── conflict.dto.ts
│   │
│   └── feedback/                    # 反馈模块
│       ├── feedback.module.ts
│       ├── feedback.controller.ts
│       ├── feedback.service.ts
│       └── dto/
│           └── feedback.dto.ts
│
└── infrastructure/                  # 基础设施
    ├── database/
    │   ├── database.module.ts
    │   └── database.service.ts
    ├── redis/
    │   ├── redis.module.ts
    │   └── redis.service.ts
    └── queue/
        ├── queue.module.ts
        └── queue.service.ts
```

## 2. 核心组件设计

### 2.1 推荐引擎

#### RuleEngine - 规则引擎

```typescript
@Injectable()
export class RuleEngine {
  private rules: RecommendationRule[] = [];
  
  constructor(
    private readonly ruleRepository: RuleRepository,
    private readonly logger: Logger
  ) {}
  
  async initialize(): Promise<void> {
    this.rules = await this.ruleRepository.findActiveRules();
    this.logger.log(`Loaded ${this.rules.length} recommendation rules`);
  }
  
  async recommend(customer: CustomerProfile): Promise<RecommendedTag[]> {
    const recommendations: RecommendedTag[] = [];
    
    // 按优先级排序规则
    const sortedRules = this.rules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      try {
        if (await this.evaluateRule(rule, customer)) {
          const tag = this.applyRule(rule, customer);
          recommendations.push(tag);
        }
      } catch (error) {
        this.logger.error(`Rule ${rule.name} failed`, error);
      }
    }
    
    return recommendations;
  }
  
  private async evaluateRule(rule: RecommendationRule, customer: CustomerProfile): Promise<boolean> {
    // 使用表达式引擎评估规则条件
    const context = { customer };
    return await this.expressionEngine.evaluate(rule.expression, context);
  }
  
  private applyRule(rule: RecommendationRule, customer: CustomerProfile): RecommendedTag {
    return {
      name: rule.tagTemplate.name,
      category: rule.tagTemplate.category,
      confidence: rule.tagTemplate.baseConfidence,
      source: 'rule',
      reason: `匹配规则：${rule.name}`
    };
  }
}
```

#### ClusteringEngine - 聚类引擎

```typescript
@Injectable()
export class ClusteringEngine {
  constructor(
    private readonly configService: ConfigService,
    private readonly customerService: CustomerService,
    private readonly logger: Logger
  ) {}
  
  async executeClustering(config: ClusteringConfig): Promise<ClusteringResult> {
    // 1. 加载客户特征数据
    const features = await this.loadCustomerFeatures();
    
    // 2. 数据预处理
    const normalizedFeatures = this.normalize(features);
    
    // 3. 执行聚类算法
    const clusters = await this.runKMeans(normalizedFeatures, config.k);
    
    // 4. 计算簇特征
    const clusterProfiles = await this.analyzeClusters(clusters, features);
    
    // 5. 生成簇标签
    const recommendations = await this.generateClusterTags(clusterProfiles);
    
    return {
      clusters,
      profiles: clusterProfiles,
      recommendations
    };
  }
  
  private async runKMeans(features: number[][], k: number): Promise<Cluster[]> {
    // 使用 TensorFlow.js 实现 K-Means 算法
    const model = tf.sequential();
    // ... 模型定义和训练
    
    const result = await model.fit(tf.tensor2d(features), {
      epochs: 100,
      batchSize: 32
    });
    
    return this.extractClusters(result);
  }
  
  private async generateClusterTags(profiles: ClusterProfile[]): Promise<RecommendedTag[]> {
    const tags: RecommendedTag[] = [];
    
    for (const profile of profiles) {
      // 基于簇特征生成标签
      if (profile.avgOrderValue > 10000) {
        tags.push({
          name: '高消费客户群',
          category: 'value',
          confidence: 0.85,
          source: 'clustering',
          reason: `该群体平均消费${profile.avgOrderValue}元`
        });
      }
      
      if (profile.purchaseFrequency > 5) {
        tags.push({
          name: '高频购买群体',
          category: 'behavior',
          confidence: 0.80,
          source: 'clustering',
          reason: `该群体月均购买${profile.purchaseFrequency.toFixed(1)}次`
        });
      }
    }
    
    return tags;
  }
}
```

#### AssociationEngine - 关联引擎

```typescript
@Injectable()
export class AssociationEngine {
  private associationRules: AssociationRule[] = [];
  
  constructor(
    private readonly tagService: TagService,
    private readonly logger: Logger
  ) {}
  
  async mineAssociationRules(
    minSupport: number = 0.1,
    minConfidence: number = 0.6
  ): Promise<void> {
    // 1. 加载所有客户的标签数据
    const customerTags = await this.tagService.getAllCustomerTags();
    
    // 2. 使用 Apriori 算法挖掘频繁项集
    const frequentItemsets = this.apriori(customerTags, minSupport);
    
    // 3. 从频繁项集生成关联规则
    this.associationRules = this.generateRules(frequentItemsets, minConfidence);
    
    this.logger.log(`Mined ${this.associationRules.length} association rules`);
  }
  
  recommend(existingTags: string[]): RecommendedTag[] {
    const recommendations: RecommendedTag[] = [];
    
    for (const rule of this.associationRules) {
      // 检查规则前件是否匹配
      if (this.matchesAntecedent(rule, existingTags)) {
        const consequentTag = rule.consequent;
        
        // 排除已有标签
        if (!existingTags.includes(consequentTag)) {
          recommendations.push({
            name: consequentTag,
            category: 'association',
            confidence: rule.confidence,
            source: 'association',
            reason: `基于关联规则：${rule.antecedents.join(', ')} → ${consequentTag}`,
            lift: rule.lift
          });
        }
      }
    }
    
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }
  
  private apriori(transactions: string[][], minSupport: number): FrequentItemset[] {
    // 实现 Apriori 算法
    // 1. 计算单项集的支持度
    // 2. 筛选频繁项集
    // 3. 迭代生成 k-项集
    // 4. 返回所有频繁项集
  }
}
```

### 2.2 评分引擎

#### ScoringService - 评分服务

```typescript
@Injectable()
export class ScoringService {
  constructor(
    private readonly coverageScorer: CoverageScorer,
    private readonly discriminationScorer: DiscriminationScorer,
    private readonly stabilityScorer: StabilityScorer,
    private readonly businessValueScorer: BusinessValueScorer,
    private readonly scoreRepository: ScoreRepository,
    private readonly cacheManager: CacheManager,
    private readonly logger: Logger
  ) {}
  
  async calculateTagScore(tagId: number): Promise<TagScore> {
    // 1. 尝试从缓存获取
    const cached = await this.cacheManager.get(`tag:score:${tagId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 2. 加载标签数据
    const tag = await this.tagService.findById(tagId);
    if (!tag) {
      throw new NotFoundException(`Tag ${tagId} not found`);
    }
    
    // 3. 并行计算四个维度评分
    const [coverage, discrimination, stability, businessValue] = await Promise.all([
      this.coverageScorer.calculate(tag),
      this.discriminationScorer.calculate(tag),
      this.stabilityScorer.calculate(tag),
      this.businessValueScorer.calculate(tag)
    ]);
    
    // 4. 计算综合评分
    const weights = this.configService.get('scoring.weights');
    const overallScore = 
      coverage.score * weights.coverage +
      discrimination.score * weights.discrimination +
      stability.score * weights.stability +
      businessValue.score * weights.businessValue;
    
    // 5. 生成洞察建议
    const insights = this.generateInsights({
      coverage,
      discrimination,
      stability,
      businessValue
    });
    
    // 6. 构建评分结果
    const score: TagScore = {
      tagId: tag.id,
      tagName: tag.name,
      overallScore: Math.round(overallScore * 100) / 100,
      recommendation: this.getRecommendation(overallScore),
      breakdown: {
        coverage,
        discrimination,
        stability,
        businessValue
      },
      insights,
      calculatedAt: new Date()
    };
    
    // 7. 保存到数据库和缓存
    await this.scoreRepository.upsert(score);
    await this.cacheManager.set(`tag:score:${tagId}`, JSON.stringify(score), 3600);
    
    return score;
  }
  
  private generateInsights(scores: ScoreBreakdown): string[] {
    const insights: string[] = [];
    
    if (scores.coverage.score > 90) {
      insights.push('该标签覆盖率处于理想区间，既不过于宽泛也不过于狭窄');
    }
    
    if (scores.discrimination.iv > 0.3) {
      insights.push(`该标签具有很强的区分力，IV 值为${scores.discrimination.iv.toFixed(2)}`);
    }
    
    if (scores.stability.psi < 0.1) {
      insights.push('该标签稳定性良好，月度波动较小');
    }
    
    if (scores.businessValue.roi > 2.0) {
      insights.push(`使用该标签的营销活动 ROI 提升${scores.businessValue.roi.toFixed(1)}倍`);
    }
    
    return insights;
  }
}
```

### 2.3 冲突检测器

#### ConflictDetectionService

```typescript
@Injectable()
export class ConflictDetectionService {
  constructor(
    private readonly namingDetector: NamingConflictDetector,
    private readonly logicalDetector: LogicalConflictDetector,
    private readonly redundancyDetector: RedundancyConflictDetector,
    private readonly logger: Logger
  ) {}
  
  async detectConflicts(tagNames: string[], options?: DetectionOptions): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const checkTypes = options?.types || ['naming', 'logical', 'redundancy'];
    
    // 1. 命名冲突检测
    if (checkTypes.includes('naming')) {
      const namingConflicts = await this.namingDetector.detect(tagNames);
      conflicts.push(...namingConflicts);
    }
    
    // 2. 逻辑冲突检测
    if (checkTypes.includes('logical')) {
      const logicalConflicts = await this.logicalDetector.detect(tagNames);
      conflicts.push(...logicalConflicts);
    }
    
    // 3. 冗余冲突检测
    if (checkTypes.includes('redundancy')) {
      const redundancyConflicts = await this.redundancyDetector.detect(tagNames);
      conflicts.push(...redundancyConflicts);
    }
    
    // 4. 按严重程度排序
    return conflicts.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }
}
```

## 3. 数据库设计

### 3.1 ER 图

```
┌─────────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│   customers     │       │ tag_recommendations  │       │      tags       │
├─────────────────┤       ├──────────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ customer_id (FK)     │       │ id (PK)         │
│ name            │       │ tag_name             │──────►│ name            │
│ industry        │       │ tag_category         │       │ category        │
│ company_size    │       │ confidence           │       │ description     │
│ region          │       │ source               │       │ created_at      │
│ ...             │       │ reason               │       │ updated_at      │
└─────────────────┘       │ is_accepted          │       └─────────────────┘
                          │ accepted_at          │              ▲
                          │ accepted_by          │              │
                          │ created_at           │              │
                          └──────────────────────┘              │
                                                                 │
┌─────────────────┐       ┌──────────────────────┐              │
│    tag_scores   │       │recommendation_rules  │              │
├─────────────────┤       ├──────────────────────┤              │
│ id (PK)         │       │ id (PK)              │              │
│ tag_id (FK)     │──────►│ rule_name            │              │
│ coverage_score  │       │ rule_expression      │              │
│ discrimination_…│       │ priority             │              │
│ stability_score │       │ tag_template (JSONB) │              │
│ business_value… │       │ is_active            │              │
│ overall_score   │       │ hit_count            │              │
│ recommendation  │       │ acceptance_rate      │              │
│ insights        │       │ created_at           │              │
│ calculated_at   │       │ updated_at           │              │
└─────────────────┘       └──────────────────────┘              │
                                                                 │
┌─────────────────┐       ┌──────────────────────┐              │
│clustering_configs│       │  customer_tags       │──────────────┘
├─────────────────┤       ├──────────────────────┤
│ id (PK)         │       │ customer_id (FK)     │
│ config_name     │       │ tag_id (FK)          │
│ algorithm       │       │ assigned_at          │
│ parameters      │       │ assigned_by          │
│ (JSONB)         │       └──────────────────────┘
│ feature_weights │
│ is_active       │
│ last_run_at     │
└─────────────────┘
```

### 3.2 分区策略

```sql
-- tag_recommendations 表按月分区
CREATE TABLE tag_recommendations_y2026m03 PARTITION OF tag_recommendations
FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE tag_recommendations_y2026m04 PARTITION OF tag_recommendations
FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- 索引也需要在分区上创建
CREATE INDEX idx_rec_customer_2026m03 ON tag_recommendations_y2026m03(customer_id);
```

## 4. 接口设计

### 4.1 RESTful API 端点

```typescript
// 推荐相关
POST   /api/v1/tags/recommendations          // 获取标签推荐
GET    /api/v1/customers/:id/recommendations // 获取单个客户推荐
POST   /api/v1/recommendations/batch         // 批量推荐
POST   /api/v1/recommendations/refresh       // 刷新推荐

// 评分相关
GET    /api/v1/tags/:id/score                // 获取标签评分
GET    /api/v1/tags/scores                   // 获取所有标签评分
POST   /api/v1/tags/scores/calculate         // 重新计算评分

// 冲突检测
POST   /api/v1/tags/conflicts                // 检测标签冲突
GET    /api/v1/tags/:id/conflicts            // 检测特定标签冲突

// 反馈相关
POST   /api/v1/recommendations/feedback      // 提交反馈
GET    /api/v1/feedback/statistics           // 获取反馈统计

// 管理相关
GET    /api/v1/admin/rules                   // 获取推荐规则
POST   /api/v1/admin/rules                   // 创建推荐规则
PUT    /api/v1/admin/rules/:id               // 更新推荐规则
DELETE /api/v1/admin/rules/:id               // 删除推荐规则
```

## 5. 部署架构

### 5.1 容器化部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/customer_label
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3
  
  worker:
    build: .
    command: npm run worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/customer_label
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 2
  
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=customer_label
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

volumes:
  postgres_data:
  redis_data:
```

## 6. 监控和告警

### 6.1 关键指标

```typescript
// Prometheus 指标
const metrics = {
  // 推荐性能
  recommendation_duration_seconds: 'Histogram',
  recommendations_total: 'Counter',
  recommendation_cache_hits: 'Counter',
  
  // 推荐质量
  recommendation_acceptance_rate: 'Gauge',
  average_confidence_score: 'Gauge',
  
  // 系统健康
  active_recommenders: 'Gauge',
  queue_size: 'Gauge',
  error_rate: 'Counter'
};
```

### 6.2 告警规则

```yaml
# prometheus_alerts.yml
groups:
  - name: recommender
    rules:
      - alert: HighErrorRate
        expr: rate(recommendation_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "推荐服务错误率过高"
          
      - alert: LowAcceptanceRate
        expr: avg(recommendation_acceptance_rate) < 0.3
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "推荐采纳率过低，需要优化算法"
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(recommendation_duration_seconds_bucket[5m])) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "推荐服务 P95 延迟过高"
```

---

**文档状态**: Draft  
**版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26
