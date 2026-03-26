# 消息队列配置指南

## 📋 概述

本项目使用 [Bull](https://github.com/OptimalBits/bull) 作为消息队列库，基于 Redis 实现。

**核心特性**:
- ✅ 持久化存储
- ✅ 任务优先级
- ✅ 重试机制
- ✅ 延迟任务
- ✅ 任务分组（队列）
- ✅ 事件监听
- ✅ 并发控制

---

## 🏗️ 架构设计

### 模块结构

```
src/infrastructure/queue/
├── queue.service.ts           # 队列管理服务
├── queue.module.ts            # 队列模块
├── handlers/
│   ├── recommendation.handler.ts  # 推荐计算处理器
│   └── index.ts               # 处理器导出
└── index.ts                   # 模块导出
```

### 依赖关系

```
QueueModule (Global Module)
├── QueueService
│   └── Bull Queues
└── Handlers
    ├── RecommendationQueueHandler
    └── (其他处理器...)
```

---

## 🔧 配置说明

### 环境变量

在 `.env` 文件中配置：

```env
# Redis 配置（队列复用 Redis）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 模块注册

#### 方式一：默认配置（推荐）

```typescript
// app.module.ts
import { QueueModule } from './infrastructure/queue';

@Module({
  imports: [
    QueueModule.forRoot(), // 使用环境变量配置
  ],
})
export class AppModule {}
```

#### 方式二：自定义配置

```typescript
import { QueueModule } from './infrastructure/queue';

@Module({
  imports: [
    QueueModule.forRoot({
      name: 'default',
      redis: {
        host: 'localhost',
        port: 6379,
        password: 'your-password',
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
  ],
})
export class AppModule {}
```

---

## 📖 使用示例

### 1. 使用推荐计算队列

```typescript
import { Injectable } from '@nestjs/common';
import { RecommendationQueueHandler } from './infrastructure/queue/handlers';

@Injectable()
export class CustomerService {
  constructor(
    private readonly recommendationQueue: RecommendationQueueHandler
  ) {}

  /**
   * 为单个客户生成推荐
   */
  async generateRecommendations(customerId: number) {
    // 添加异步任务
    const job = await this.recommendationQueue.addRecommendationTask(
      customerId,
      undefined, // customerData（可选）
      'all',     // mode: rule|clustering|association|all
      'normal'   // priority: low|normal|high
    );

    return {
      jobId: job.id,
      status: 'queued',
      message: '推荐计算任务已加入队列',
    };
  }

  /**
   * 批量生成推荐
   */
  async batchGenerateRecommendations(customerIds: number[]) {
    const count = await this.recommendationQueue.addBatchRecommendationTasks(
      customerIds,
      'all'
    );

    return {
      total: customerIds.length,
      queued: count,
      message: `成功添加 ${count} 个推荐计算任务`,
    };
  }

  /**
   * 查看队列状态
   */
  async getQueueStatus() {
    return await this.recommendationQueue.getStats();
  }
}
```

### 2. 创建自定义队列

```typescript
import { Injectable } from '@nestjs/common';
import { QueueService } from './infrastructure/queue';

@Injectable()
export class EmailService {
  private readonly emailQueue;

  constructor(private readonly queueService: QueueService) {
    // 创建邮件发送队列
    this.emailQueue = this.queueService.createQueue(
      'emails',
      {
        host: 'localhost',
        port: 6379,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    // 注册处理器
    this.emailQueue.process(async (job) => {
      return await this.sendEmail(job.data);
    });
  }

  async sendEmail(data: { to: string; subject: string; body: string }) {
    // 实际的邮件发送逻辑
    console.log('Sending email to:', data.to);
    return { success: true };
  }

  async queueEmail(data: { to: string; subject: string; body: string }) {
    const job = await this.emailQueue.add(data);
    console.log(`Email job ${job.id} queued`);
    return job;
  }
}
```

### 3. 使用通用队列服务

```typescript
import { Injectable } from '@nestjs/common';
import { QueueService } from './infrastructure/queue';

@Injectable()
export class ReportService {
  constructor(private readonly queueService: QueueService) {}

  async generateReport(reportId: number) {
    // 获取或创建报表队列
    const queue = this.queueService.getQueue('reports');
    
    if (!queue) {
      throw new Error('Reports queue not found');
    }

    const job = await queue.add(
      { reportId, type: 'monthly' },
      {
        priority: 10,
        delay: 5000, // 5 秒后执行
      }
    );

    return { jobId: job.id };
  }

  async clearReportsQueue() {
    await this.queueService.clearQueue('reports');
  }
}
```

---

## 🎯 典型应用场景

### 场景 1: 异步推荐计算

```typescript
// Controller 层
@Controller('customers/:id/recommendations')
export class RecommendationController {
  constructor(
    private readonly recommendationQueue: RecommendationQueueHandler
  ) {}

  @Post()
  async createRecommendations(@Param('id') customerId: number) {
    const job = await this.recommendationQueue.addRecommendationTask(customerId);
    
    return {
      jobId: job.id,
      status: 'processing',
      message: '推荐计算已开始',
    };
  }

  @Get('status/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const queue = this.recommendationQueue.getQueue();
    const job = await queue?.getJob(jobId);
    
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      state: await job.getState(),
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }
}
```

### 场景 2: 定时任务调度

```typescript
@Injectable()
export class ScheduledTasks implements OnModuleInit {
  constructor(
    private readonly recommendationQueue: RecommendationQueueHandler
  ) {}

  onModuleInit() {
    // 每天凌晨 2 点为所有活跃客户生成推荐
    const cronExpression = '0 2 * * *';
    
    // 这里可以集成 node-cron 或其他定时任务库
    console.log(`Scheduled daily recommendations at ${cronExpression}`);
  }

  async processDailyRecommendations() {
    // 获取所有活跃客户 ID
    const activeCustomerIds = await this.getActiveCustomers();
    
    // 批量添加到队列
    await this.recommendationQueue.addBatchRecommendationTasks(
      activeCustomerIds,
      'all'
    );
  }

  private async getActiveCustomers(): Promise<number[]> {
    // TODO: 从数据库查询活跃客户
    return [1001, 1002, 1003];
  }
}
```

### 场景 3: 实时推荐（高优先级）

```typescript
@Injectable()
export class RealTimeRecommendationService {
  constructor(
    private readonly recommendationQueue: RecommendationQueueHandler
  ) {}

  /**
   * 用户行为触发实时推荐
   */
  async triggerByUserAction(userId: number, action: string) {
    // 高优先级，立即处理
    const job = await this.recommendationQueue.addRecommendationTask(
      userId,
      { action, timestamp: Date.now() },
      'rule',    // 只使用规则引擎，速度快
      'high'     // 高优先级
    );

    return job;
  }
}
```

---

## 📊 监控和管理

### 队列统计信息

```typescript
@Controller('queues')
export class QueueStatsController {
  constructor(
    private readonly recommendationQueue: RecommendationQueueHandler
  ) {}

  @Get('recommendations/stats')
  async getStats() {
    const stats = await this.recommendationQueue.getStats();
    return {
      ...stats,
      timestamp: new Date(),
    };
  }

  @Post('recommendations/clear')
  async clearQueue() {
    await this.recommendationQueue.clearQueue();
    return { message: 'Queue cleared' };
  }
}
```

### Bull Dashboard（推荐）

安装 Bull Board 可视化界面：

```bash
npm install bull-board express
```

```typescript
// main.ts 中添加
import { createBullBoard } from 'bull-board';
import { BullAdapter } from 'bull-board/bullAdapter';

async function setupBullDashboard(queues: Bull.Queue[]) {
  const { router } = createBullBoard(
    queues.map(queue => new BullAdapter(queue))
  );

  const app = express();
  app.use('/admin/queues', router);
  
  console.log('Bull Dashboard available at http://localhost:3000/admin/queues');
}
```

---

## ⚙️ 作业选项配置

### 重试策略

```typescript
const jobOptions: Bull.JobOptions = {
  attempts: 3,              // 最多重试 3 次
  backoff: {
    type: 'exponential',    // 指数退避
    delay: 1000,            // 初始延迟 1 秒
  },
};
```

### 任务过期

```typescript
const jobOptions: Bull.JobOptions = {
  removeOnComplete: 100,    // 完成后保留 100 条记录
  removeOnFail: 1000,       // 失败后保留 1000 条记录
  timeout: 300000,          // 5 分钟超时
};
```

### 延迟任务

```typescript
const jobOptions: Bull.JobOptions = {
  delay: 60000,             // 1 分钟后执行
};
```

### 任务优先级

```typescript
const jobOptions: Bull.JobOptions = {
  priority: 10,             // 数字越大优先级越高
};
```

---

## 🔍 故障排查

### 问题 1: 任务卡住不执行

**可能原因**:
- Worker 进程崩溃
- Redis 连接断开
- 任务处理超时

**解决方案**:
```typescript
// 设置合理的超时时间
queue.process(async (job) => {
  return await Promise.race([
    doWork(),
    timeout(300000) // 5 分钟超时
  ]);
});

// 检测停滞任务
queue.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} stalled, requeuing...`);
});
```

### 问题 2: 任务重复执行

**可能原因**:
- 多个 Worker 实例
- 任务未及时标记完成

**解决方案**:
```typescript
// 确保每个任务只有一个处理器
queue.process(async (job) => {
  try {
    return await doWork();
  } finally {
    // 清理资源
    await cleanup();
  }
});
```

### 问题 3: Redis 内存占用过高

**解决方案**:
```typescript
// 定期清理已完成/失败的任务
const queue = new Bull('myQueue', {
  redis: {
    // ... redis config
  },
  defaultJobOptions: {
    removeOnComplete: 100,   // 限制完成记录数
    removeOnFail: 1000,      // 限制失败记录数
  }
});

// 手动清理
setInterval(async () => {
  const completed = await queue.getCompleted();
  if (completed.length > 1000) {
    await queue.clean(0, 100, 'completed');
  }
}, 3600000); // 每小时清理一次
```

---

## 📚 相关资源

- [Bull 官方文档](https://github.com/OptimalBits/bull)
- [Bull 最佳实践](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md)
- [Bull Board Dashboard](https://github.com/felixmosh/bull-board)

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26
