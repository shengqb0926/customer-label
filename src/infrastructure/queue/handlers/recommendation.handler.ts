import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import Bull from 'bull';

export interface RecommendationJobData {
  customerId: number;
  customerData?: any;
  mode?: 'rule' | 'clustering' | 'association' | 'all';
  priority?: number;
}

export interface RecommendationJobResult {
  customerId: number;
  recommendations: Array<{
    tagName: string;
    tagCategory: string;
    confidence: number;
    source: 'rule' | 'clustering' | 'association';
    reason: string;
  }>;
  processedAt: Date;
}

@Injectable()
export class RecommendationQueueHandler {
  private readonly logger = new Logger(RecommendationQueueHandler.name);
  private readonly queueName = 'recommendations';
  private queue: Bull.Queue | null = null;

  constructor(private readonly queueService: QueueService) {
    // 创建推荐队列
    this.queue = this.queueService.createQueue(
      this.queueName,
      {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 50,
        removeOnFail: 100,
      }
    );

    // 注册任务处理器
    this.registerProcessor();
    
    this.logger.log(`Recommendation queue handler initialized`);
  }

  /**
   * 注册任务处理器
   */
  private registerProcessor() {
    if (!this.queue) return;

    this.queue.process(async (job: Bull.Job<RecommendationJobData>) => {
      this.logger.log(`Processing recommendation job ${job.id} for customer ${job.data.customerId}`);
      
      try {
        const result = await this.processRecommendation(job.data);
        this.logger.log(`Job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        this.logger.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    });
  }

  /**
   * 处理推荐计算（核心逻辑）
   */
  private async processRecommendation(
    data: RecommendationJobData
  ): Promise<RecommendationJobResult> {
    const { customerId, customerData, mode = 'all' } = data;

    this.logger.debug(`Processing recommendations for customer ${customerId}, mode: ${mode}`);

    // TODO: 实现具体的推荐算法
    // 这里暂时返回模拟数据，后续会实现真实的推荐引擎
    
    const recommendations = [];

    // 模拟规则引擎推荐
    if (mode === 'rule' || mode === 'all') {
      recommendations.push({
        tagName: '高价值客户',
        tagCategory: 'value',
        confidence: 0.95,
        source: 'rule' as const,
        reason: '基于消费金额和频次规则匹配',
      });
    }

    // 模拟聚类推荐
    if (mode === 'clustering' || mode === 'all') {
      recommendations.push({
        tagName: '活跃客户',
        tagCategory: 'activity',
        confidence: 0.88,
        source: 'clustering' as const,
        reason: '基于行为特征的聚类分析',
      });
    }

    // 模拟关联推荐
    if (mode === 'association' || mode === 'all') {
      recommendations.push({
        tagName: '潜力客户',
        tagCategory: 'potential',
        confidence: 0.75,
        source: 'association' as const,
        reason: '基于相似客户群体的关联分析',
      });
    }

    // 保存推荐结果到数据库（后续实现）
    // await this.saveRecommendations(customerId, recommendations);

    return {
      customerId,
      recommendations,
      processedAt: new Date(),
    };
  }

  /**
   * 添加推荐计算任务
   */
  async addRecommendationTask(
    customerId: number,
    customerData?: any,
    mode: 'rule' | 'clustering' | 'association' | 'all' = 'all',
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<Bull.Job<RecommendationJobData> | null> {
    const priorityMap = {
      low: 0,
      normal: 5,
      high: 10,
    };

    const jobData: RecommendationJobData = {
      customerId,
      customerData,
      mode,
      priority: priorityMap[priority],
    };

    return await this.queueService.addJob(this.queueName, jobData, {
      priority: priorityMap[priority],
      jobId: `rec:${customerId}:${Date.now()}`,
    });
  }

  /**
   * 批量添加推荐任务
   */
  async addBatchRecommendationTasks(
    customerIds: number[],
    mode: 'rule' | 'clustering' | 'association' | 'all' = 'all'
  ): Promise<number> {
    let successCount = 0;

    for (const customerId of customerIds) {
      try {
        await this.addRecommendationTask(customerId, undefined, mode);
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to add task for customer ${customerId}:`, error);
      }
    }

    this.logger.log(`Successfully added ${successCount}/${customerIds.length} recommendation tasks`);
    return successCount;
  }

  /**
   * 获取队列统计信息
   */
  async getStats() {
    return await this.queueService.getQueueStats(this.queueName);
  }

  /**
   * 清空队列
   */
  async clearQueue() {
    await this.queueService.clearQueue(this.queueName);
  }

  /**
   * 获取队列实例（用于高级操作）
   */
  getQueue(): Bull.Queue | null {
    return this.queue;
  }
}
