import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logger } from './winston.config';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly httpLogger = Logger.getLogger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, headers } = req;
    const startTime = Date.now();

    // 记录响应完成事件
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

      // 根据状态码选择日志级别
      if (statusCode >= 500) {
        logger.error(logMessage);
      } else if (statusCode >= 400) {
        logger.warn(logMessage);
      } else {
        logger.http(logMessage);
      }

      // 记录详细请求信息（仅开发和调试环境）
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`${method} ${originalUrl}`, {
          method,
          url: originalUrl,
          statusCode,
          duration,
          ip,
          userAgent: headers['user-agent'],
        });
      }
    });

    next();
  }
}
