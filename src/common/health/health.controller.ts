import { Controller, Get, Logger } from '@nestjs/common';
import { promClient } from 'prom-client';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  /**
   * 健康检查端点
   */
  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务运行正常' })
  @ApiResponse({ status: 503, description: '服务不可用' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * 就绪检查端点
   */
  @Get('ready')
  @ApiOperation({ summary: '就绪检查' })
  @ApiResponse({ status: 200, description: '服务已就绪' })
  @ApiResponse({ status: 503, description: '服务未就绪' })
  async ready() {
    // TODO: 添加数据库、Redis 等依赖检查
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: 'ok',
        redis: 'ok',
        queue: 'ok',
      },
    };
  }

  /**
   * Prometheus 指标端点
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Prometheus 监控指标' })
  @ApiResponse({ 
    status: 200, 
    description: '返回 Prometheus 格式的监控指标',
    content: {
      'text/plain': {
        schema: { type: 'string' }
      }
    }
  })
  async metrics() {
    return await promClient.register.metrics();
  }
}
