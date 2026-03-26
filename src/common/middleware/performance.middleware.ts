import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface PerformanceMetrics {
  totalRequests: number;
  avgResponseTime: number;
  slowRequests: number; // > 1000ms
  responseTimeByEndpoint: Map<string, number[]>;
}

/**
 * 性能监控中间件
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);
  private metrics: PerformanceMetrics = {
    totalRequests: 0,
    avgResponseTime: 0,
    slowRequests: 0,
    responseTimeByEndpoint: new Map(),
  };

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const endpoint = `${req.method} ${req.path}`;

    // 请求结束后记录性能数据
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      this.metrics.totalRequests++;
      
      // 更新平均响应时间
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1) + duration) / 
        this.metrics.totalRequests;

      // 统计慢请求（> 1000ms）
      if (duration > 1000) {
        this.metrics.slowRequests++;
        this.logger.warn(
          `Slow request detected: ${endpoint} took ${duration}ms [${statusCode}]`
        );
      }

      // 按端点统计响应时间
      if (!this.metrics.responseTimeByEndpoint.has(endpoint)) {
        this.metrics.responseTimeByEndpoint.set(endpoint, []);
      }
      const times = this.metrics.responseTimeByEndpoint.get(endpoint)!;
      times.push(duration);
      
      // 只保留最近 100 次请求的数据
      if (times.length > 100) {
        times.shift();
      }

      // 记录日志
      this.logger.log(
        `${endpoint} ${statusCode} ${duration}ms`
      );
    });

    next();
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取指定端点的平均响应时间
   */
  getAvgResponseTime(endpoint: string): number {
    const times = this.metrics.responseTimeByEndpoint.get(endpoint);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
}
