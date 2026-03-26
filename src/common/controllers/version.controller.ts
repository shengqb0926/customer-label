import { Controller, Get, Logger, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('系统信息')
@Controller()
export class VersionController {
  private readonly logger = new Logger(VersionController.name);

  @Get('version')
  @ApiOperation({ summary: '获取 API 版本信息' })
  @ApiResponse({ status: 200, description: '返回当前 API 版本信息' })
  getVersion(): {
    version: string;
    name: string;
    description: string;
    timestamp: string;
  } {
    return {
      version: '1.0.0',
      name: '客户标签智能推荐系统 API',
      description: 'Customer Label Intelligent Recommendation System',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '返回服务健康状态' })
  healthCheck(): {
    status: string;
    timestamp: string;
    uptime: number;
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
