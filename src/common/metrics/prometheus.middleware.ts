import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as promClient from 'prom-client';

@Injectable()
export class PrometheusMiddleware implements NestMiddleware {
  // HTTP 请求计数器
  private readonly httpRequestCounter: promClient.Counter<string>;

  // HTTP 响应时间直方图
  private readonly httpResponseDuration: promClient.Histogram<string>;

  constructor() {
    // 注册 HTTP 请求计数器
    this.httpRequestCounter = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code'],
    });

    // 注册 HTTP 响应时间直方图
    this.httpResponseDuration = new promClient.Histogram({
      name: 'http_response_duration_seconds',
      help: 'HTTP response duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10], // 秒
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = (Date.now() - start) / 1000; // 转换为秒

      // 记录请求计数
      this.httpRequestCounter.inc({
        method,
        path: this.sanitizePath(originalUrl),
        status_code: statusCode,
      });

      // 记录响应时间
      this.httpResponseDuration.observe(
        {
          method,
          path: this.sanitizePath(originalUrl),
        },
        duration
      );
    });

    next();
  }

  /**
   * 清理路径参数（避免基数爆炸）
   * 例如：/api/users/123 -> /api/users/:id
   */
  private sanitizePath(path: string): string {
    // 替换数字 ID 为 :id
    return path.replace(/\/\d+/g, '/:id');
  }
}
