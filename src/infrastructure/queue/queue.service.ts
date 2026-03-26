import { Injectable, Logger } from '@nestjs/common';
import Bull from 'bull';

export interface QueueConfig {
  name: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  defaultJobOptions?: Bull.JobOptions;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues: Map<string, Bull.Queue> = new Map();

  constructor(config?: QueueConfig) {
    const defaultConfig: QueueConfig = {
      name: 'default',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    };

    const finalConfig = config || defaultConfig;
    
    // 创建默认队列
    this.createQueue(finalConfig.name, finalConfig.redis, finalConfig.defaultJobOptions);
    
    this.logger.log(`Queue service initialized with Redis: ${finalConfig.redis.host}:${finalConfig.redis.port}`);
  }

  /**
   * 创建队列
   */
  createQueue(
    name: string,
    redisConfig: QueueConfig['redis'],
    defaultJobOptions?: Bull.JobOptions
  ): Bull.Queue {
    if (this.queues.has(name)) {
      this.logger.warn(`Queue "${name}" already exists`);
      return this.queues.get(name)!;
    }

    const queue = new Bull(name, {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
        ...defaultJobOptions,
      },
    });

    // 队列事件监听
    queue.on('error', (error) => {
      this.logger.error(`Queue "${name}" error:`, error);
    });

    queue.on('waiting', (jobId) => {
      this.logger.debug(`Job ${jobId} is waiting`);
    });

    queue.on('active', (job) => {
      this.logger.debug(`Job ${job.id} is now active`);
    });

    queue.on('completed', (job, result) => {
      this.logger.log(`Job ${job.id} completed with result:`, result);
    });

    queue.on('failed', (job, error) => {
      this.logger.error(`Job ${job?.id} failed:`, error);
    });

    queue.on('stalled', (jobId) => {
      this.logger.warn(`Job ${jobId} stalled`);
    });

    this.queues.set(name, queue);
    this.logger.log(`Queue "${name}" created successfully`);

    return queue;
  }

  /**
   * 获取队列
   */
  getQueue(name: string): Bull.Queue | null {
    return this.queues.get(name) || null;
  }

  /**
   * 添加任务到队列
   */
  async addJob(
    queueName: string,
    data: any,
    options?: Bull.JobOptions
  ): Promise<Bull.Job<any> | null> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      this.logger.error(`Queue "${queueName}" not found`);
      return null;
    }

    try {
      const job = await queue.add(data, options);
      this.logger.log(`Job ${job.id} added to queue "${queueName}"`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to add job to queue "${queueName}":`, error);
      throw error;
    }
  }

  /**
   * 获取队列状态
   */
  async getQueueStats(queueName: string): Promise<{
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  } | null> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      return null;
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: queue.isPaused(),
    };
  }

  /**
   * 清空队列
   */
  async clearQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      this.logger.warn(`Queue "${queueName}" not found, skipping clear`);
      return;
    }

    try {
      await queue.empty();
      this.logger.log(`Queue "${queueName}" cleared`);
    } catch (error) {
      this.logger.error(`Failed to clear queue "${queueName}":`, error);
      throw error;
    }
  }

  /**
   * 关闭所有队列
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map((queue) =>
      queue.close()
    );

    await Promise.all(closePromises);
    this.queues.clear();
    this.logger.log('All queues closed');
  }

  /**
   * 优雅关闭
   */
  async onModuleDestroy() {
    await this.closeAll();
  }
}
