import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * SQL 注入防护中间件
 */
@Injectable()
export class SqlInjectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SqlInjectionMiddleware.name);

  // SQL 注入常见关键词
  private readonly sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(\b(UNION|JOIN|WHERE|FROM|INTO|VALUES|SET)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(WAITFOR|DELAY|BENCHMARK|SLEEP)\b)/i,
  ];

  use(req: Request, res: Response, next: NextFunction) {
    // 检查查询参数
    if (req.query) {
      const queryString = JSON.stringify(req.query);
      if (this.containsSqlInjection(queryString)) {
        this.logger.warn(`SQL injection attempt detected in query params: ${queryString}`);
        return res.status(400).json({
          statusCode: 400,
          message: '检测到潜在的 SQL 注入攻击',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 检查请求体
    if (req.body && typeof req.body === 'object') {
      const bodyString = JSON.stringify(req.body);
      if (this.containsSqlInjection(bodyString)) {
        this.logger.warn(`SQL injection attempt detected in request body: ${bodyString}`);
        return res.status(400).json({
          statusCode: 400,
          message: '检测到潜在的 SQL 注入攻击',
          timestamp: new Date().toISOString(),
        });
      }
    }

    next();
  }

  private containsSqlInjection(input: string): boolean {
    return this.sqlPatterns.some((pattern) => pattern.test(input));
  }
}
