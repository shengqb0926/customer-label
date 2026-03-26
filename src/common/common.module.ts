import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { HttpLoggerMiddleware } from './logger/http-logger.middleware';
import { PrometheusMiddleware } from './metrics/prometheus.middleware';
import { MetricsService } from './metrics/metrics.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [],
  controllers: [HealthController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 应用 HTTP 日志中间件（排除健康检查和指标端点）
    consumer
      .apply(HttpLoggerMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'ready', method: RequestMethod.GET },
        { path: 'metrics', method: RequestMethod.GET },
      )
      .forRoutes('*');

    // 应用 Prometheus 监控中间件
    consumer
      .apply(PrometheusMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'ready', method: RequestMethod.GET },
        { path: 'metrics', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
