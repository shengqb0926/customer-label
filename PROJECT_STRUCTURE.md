# 项目结构文档

## 📁 完整目录结构

```
customer-label/
├── .env                          # 环境变量配置
├── .env.example                  # 环境变量示例
├── package.json                  # NPM 依赖配置
├── tsconfig.json                 # TypeScript 编译配置
├── data-source.ts                # TypeORM 数据源配置
├── QUICKSTART.md                 # 快速启动指南
├── POSTGRESQL_INSTALL.md         # PostgreSQL 安装指南
├── REDIS_INSTALL.md              # Redis 安装指南
├── DATABASE_SETUP_GUIDE.md       # 数据库安装指南
├── TEST_DATA_GUIDE.md            # 测试数据说明
└── openspec/                     # OpenSpec 规范目录
    ├── config.yaml               # OpenSpec 配置文件
    ├── README.md
    └── changes/
        └── add-smart-tag-recommendation/
            ├── proposal.md       # 变更提案
            ├── spec.md           # 规范文档
            ├── design.md         # 设计文档
            ├── tasks.md          # 任务列表
            └── *.md              # 各任务完成报告

└── src/                          # 源代码目录
    ├── main.ts                   # 应用主入口
    ├── app.module.ts             # NestJS 根模块
    ├── entities.ts               # 实体汇总导出
    ├── entities.md               # 实体文档
    
    ├── database/                 # 数据库相关
    │   ├── migrations/           # TypeORM 迁移文件
    │   │   ├── 1711507200000-CreateTagRecommendationsTable.ts
    │   │   ├── 1711507260000-CreateTagScoresTable.ts
    │   │   ├── 1711507320000-CreateRecommendationRulesTable.ts
    │   │   ├── 1711507380000-CreateClusteringConfigsTable.ts
    │   │   └── 1711507440000-CreateFeedbackStatisticsTable.ts
    │   └── README.md             # 数据库文档
    
    ├── infrastructure/           # 基础设施层
    │   ├── redis/                # Redis 缓存模块
    │   │   ├── index.ts
    │   │   ├── redis.service.ts
    │   │   ├── cache.service.ts
    │   │   ├── redis.module.ts
    │   │   └── README.md
    │   └── queue/                # 消息队列模块
    │       ├── index.ts
    │       ├── queue.service.ts
    │       ├── queue.module.ts
    │       ├── handlers/
    │       │   ├── index.ts
    │       │   └── recommendation.handler.ts
    │       └── README.md
    
    └── modules/                  # 业务模块层
        ├── recommendation/       # 推荐模块
        │   ├── entities/
        │   │   ├── tag-recommendation.entity.ts
        │   │   ├── recommendation-rule.entity.ts
        │   │   ├── clustering-config.entity.ts
        │   │   └── index.ts
        │   ├── recommendation.module.ts
        │   ├── recommendation.service.ts
        │   └── recommendation.controller.ts
        
        ├── scoring/              # 评分模块
        │   ├── entities/
        │   │   ├── tag-score.entity.ts
        │   │   └── index.ts
        │   ├── scoring.module.ts
        │   ├── scoring.service.ts
        │   └── scoring.controller.ts
        
        └── feedback/             # 反馈模块
            ├── entities/
            │   ├── feedback-statistic.entity.ts
            │   └── index.ts
            ├── feedback.module.ts
            ├── feedback.service.ts
            └── feedback.controller.ts
```

---

## 🏗️ 架构分层

### 1. **基础设施层 (infrastructure/)**
提供通用的技术组件，可复用于所有业务模块。

**特点**:
- ✅ 全局模块（@Global()）
- ✅ 与具体业务解耦
- ✅ 可独立测试

**包含模块**:
- `RedisModule` - Redis 缓存和基础操作
- `QueueModule` - Bull 消息队列管理

### 2. **业务模块层 (modules/)**
实现具体的业务逻辑，按领域划分。

**模块组织**:
```
module-name/
├── entities/           # TypeORM 实体类
│   ├── *.entity.ts
│   └── index.ts
├── module-name.module.ts    # 模块定义
├── module-name.service.ts   # 业务逻辑层
└── module-name.controller.ts # API 接口层
```

**依赖关系**:
```
Controller → Service → Repository (TypeORM)
                    ↓
              Infrastructure (Redis/Queue)
```

### 3. **数据层 (database/)**
数据库相关的配置和迁移脚本。

**包含内容**:
- TypeORM 迁移文件
- 数据库连接配置
- SQL 脚本

---

## 📦 模块职责

### RecommendationModule（推荐模块）

**职责**: 
- 为客户生成标签推荐
- 管理推荐规则
- 管理聚类配置
- 处理推荐反馈

**核心实体**:
- `TagRecommendation` - 标签推荐结果
- `RecommendationRule` - 推荐规则
- `ClusteringConfig` - 聚类配置

**API 端点**:
- `GET /recommendations/customer/:id` - 获取客户推荐
- `POST /recommendations/generate/:id` - 生成推荐
- `POST /recommendations/batch-generate` - 批量生成
- `GET /recommendations/stats` - 统计信息
- `GET /recommendations/rules/active` - 活跃规则
- `GET /recommendations/configs/clustering` - 聚类配置

### ScoringModule（评分模块）

**职责**:
- 计算标签质量评分
- 确定标签推荐等级
- 分析标签价值

**核心实体**:
- `TagScore` - 标签评分

**评分维度**:
1. 覆盖率（Coverage）
2. 区分度（Discrimination，含 IV 值）
3. 稳定性（Stability，含 PSI 值）
4. 业务价值（Business Value，含 ROI）

**API 端点**:
- `GET /scores/:tagId` - 获取标签评分
- `GET /scores` - 获取所有评分
- `POST /scores` - 更新评分
- `POST /scores/batch` - 批量更新
- `GET /scores/recommendation/:level` - 按等级查询
- `GET /scores/stats/overview` - 统计摘要

### FeedbackModule（反馈模块）

**职责**:
- 收集推荐反馈
- 统计分析采纳率
- 追踪趋势变化

**核心实体**:
- `FeedbackStatistic` - 反馈统计

**统计指标**:
- 总推荐数
- 采纳数/拒绝数/忽略数/修改数
- 平均置信度
- 采纳率

**API 端点**:
- `POST /feedback/daily` - 记录每日反馈
- `GET /feedback/:date` - 获取指定日期
- `GET /feedback/recent/days` - 最近 N 天
- `GET /feedback/stats/avg-acceptance-rate` - 平均采纳率
- `GET /feedback/stats/trend` - 反馈趋势
- `GET /feedback/stats/summary` - 统计摘要

---

## 🔌 依赖注入关系

### 完整依赖图

```
AppModule
├── ConfigModule (global)
├── TypeOrmModule (global)
├── RedisModule (global)
├── QueueModule (global)
├── RecommendationModule
│   ├── TypeOrmModule.forFeature([TagRecommendation, RecommendationRule, ClusteringConfig])
│   ├── RedisModule (CacheService)
│   ├── QueueModule (RecommendationQueueHandler)
│   └── RecommendationService → RecommendationController
├── ScoringModule
│   ├── TypeOrmModule.forFeature([TagScore])
│   ├── RedisModule (CacheService)
│   └── ScoringService → ScoringController
└── FeedbackModule
    ├── TypeOrmModule.forFeature([FeedbackStatistic])
    └── FeedbackService → FeedbackController
```

### 服务依赖详情

#### RecommendationService
```typescript
dependencies: [
  Repository<TagRecommendation>,
  Repository<RecommendationRule>,
  Repository<ClusteringConfig>,
  CacheService,
  RecommendationQueueHandler
]
```

#### ScoringService
```typescript
dependencies: [
  Repository<TagScore>,
  CacheService
]
```

#### FeedbackService
```typescript
dependencies: [
  Repository<FeedbackStatistic>
]
```

---

## 📊 数据流示例

### 场景 1: 为客户生成推荐

```
1. 用户请求
   ↓
2. RecommendationController.generateRecommendations()
   ↓
3. RecommendationService.generateForCustomer()
   ↓
4. CacheService.get() - 检查缓存
   ↓ (未命中)
5. RecommendationQueueHandler.addRecommendationTask()
   ↓
6. QueueService.addJob()
   ↓
7. Bull Queue (异步处理)
   ↓
8. RecommendationQueueHandler.processRecommendation()
   ↓
9. RecommendationService.saveRecommendations()
   ↓
10. CacheService.set() - 写入缓存
```

### 场景 2: 更新标签评分

```
1. 用户请求
   ↓
2. ScoringController.updateScore()
   ↓
3. ScoringService.updateTagScore()
   ↓
4. ScoringService.calculateOverallScore() - 计算综合评分
   ↓
5. ScoringService.determineRecommendation() - 确定等级
   ↓
6. Repository.save() - 持久化到数据库
   ↓
7. CacheService.set() - 更新缓存
```

### 场景 3: 记录反馈统计

```
1. 用户请求
   ↓
2. FeedbackController.recordDaily()
   ↓
3. FeedbackService.recordDailyFeedback()
   ↓
4. FeedbackService.calculateAcceptanceRate() - 计算采纳率
   ↓
5. Repository.save() - 持久化到数据库
```

---

## 🎯 设计模式

### 1. **Repository Pattern**
使用 TypeORM Repository 封装数据库操作。

```typescript
@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(TagRecommendation)
    private readonly recommendationRepo: Repository<TagRecommendation>
  ) {}

  async findByCustomer(customerId: number) {
    return await this.recommendationRepo.find({
      where: { customerId },
      order: { confidence: 'DESC' }
    });
  }
}
```

### 2. **Service Layer Pattern**
业务逻辑集中在 Service 层，Controller 只负责 HTTP 交互。

```typescript
// Controller - 薄
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly service: RecommendationService) {}

  @Get('customer/:id')
  async getRecommendations(@Param('id') id: number) {
    return await this.service.findByCustomer(id);
  }
}

// Service - 厚
@Injectable()
export class RecommendationService {
  // 包含所有业务逻辑
}
```

### 3. **Cache-Aside Pattern**
先查缓存，未命中则查数据库并回写缓存。

```typescript
async getTagScore(tagId: number): Promise<TagScore | null> {
  // 1. 尝试从缓存获取
  const cached = await this.cache.get(`tag:score:${tagId}`);
  if (cached) return cached;

  // 2. 从数据库查询
  const entity = await this.scoreRepo.findOne({ where: { tagId } });
  
  // 3. 写入缓存
  if (entity) {
    await this.cache.set(`tag:score:${tagId}`, entity, 1800);
  }
  
  return entity;
}
```

### 4. **Message Queue Pattern**
使用队列异步处理耗时任务。

```typescript
async generateForCustomer(customerId: number) {
  // 异步添加到队列
  const job = await this.queue.addRecommendationTask(customerId);
  
  // 立即返回，不等待处理完成
  return { jobId: job.id, status: 'queued' };
}
```

---

## 📝 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | HTTP 端口 | `3000` |
| `API_PREFIX` | API 前缀 | `/api/v1` |
| `NODE_ENV` | 运行环境 | `development` |
| `DB_HOST` | PostgreSQL 主机 | `localhost` |
| `DB_PORT` | PostgreSQL 端口 | `5432` |
| `DB_USERNAME` | 数据库用户名 | `postgres` |
| `DB_PASSWORD` | 数据库密码 | `postgres` |
| `DB_DATABASE` | 数据库名 | `customer_label` |
| `REDIS_HOST` | Redis 主机 | `localhost` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码 | `undefined` |

### TypeORM 配置

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [...],
  synchronize: false,  // 生产环境禁用
  logging: process.env.NODE_ENV === 'development',
})
```

---

## 🔍 调试技巧

### 1. 启用详细日志

在 `.env` 中设置：
```env
NODE_ENV=development
```

这将启用 TypeORM 的 SQL 日志。

### 2. 查看队列状态

```typescript
const stats = await queueService.getQueueStats('recommendations');
console.log(stats);
```

### 3. 检查缓存命中

```typescript
// 在 Service 中添加日志
this.logger.debug(`Cache ${cached ? 'HIT' : 'MISS'} for key ${key}`);
```

### 4. 测试单个模块

可以单独启动某个模块进行测试：
```typescript
// test.module.ts
@Module({
  imports: [
    RedisModule.forRoot(),
    ScoringModule, // 只导入评分模块
  ],
})
export class TestModule {}
```

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26
