import { Injectable, OnModuleInit } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  constructor() {
    // 清除默认指标（避免重复）
    promClient.collectDefaultMetrics({ register: undefined });
  }

  onModuleInit() {
    // 注册默认指标
    promClient.collectDefaultMetrics({
      prefix: 'app_',
    });
  }

  /**
   * 创建自定义计数器
   */
  createCounter(name: string, help: string): promClient.Counter<string> {
    return new promClient.Counter({
      name,
      help,
    });
  }

  /**
   * 创建自定义直方图（用于统计响应时间等）
   */
  createHistogram(
    name: string,
    help: string,
    buckets?: number[]
  ): promClient.Histogram<string> {
    return new promClient.Histogram({
      name,
      help,
      buckets: buckets || [0.1, 0.5, 1, 2, 5, 10], // 秒
    });
  }

  /**
   * 创建自定义 Gauge（用于实时指标）
   */
  createGauge(name: string, help: string): promClient.Gauge<string> {
    return new promClient.Gauge({
      name,
      help,
    });
  }

  /**
   * 获取所有指标
   */
  async getMetrics(): Promise<string> {
    return await promClient.register.metrics();
  }

  /**
   * 清空指标（测试用）
   */
  clearMetrics() {
    promClient.register.clear();
  }
}
