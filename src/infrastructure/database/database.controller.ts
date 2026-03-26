import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabasePoolMonitorService } from './database-pool-monitor.service';

@ApiTags('数据库监控')
@Controller('database')
export class DatabaseController {
  constructor(private readonly poolMonitor: DatabasePoolMonitorService) {}

  @Get('health')
  @ApiOperation({ summary: '检查数据库连接健康状态' })
  @ApiResponse({ 
    status: 200, 
    description: '返回数据库连接状态',
    schema: {
      type: 'object',
      properties: {
        connected: { type: 'boolean', example: true },
        responseTime: { type: 'number', example: 15 },
      },
    },
  })
  async healthCheck(): Promise<{
    connected: boolean;
    responseTime?: number;
    error?: string;
  }> {
    return await this.poolMonitor.testConnection();
  }

  @Get('stats')
  @ApiOperation({ summary: '获取数据库连接池统计信息' })
  @ApiResponse({ 
    status: 200, 
    description: '返回连接池详细统计',
    schema: {
      type: 'object',
      properties: {
        totalConnections: { type: 'number', example: 12 },
        activeConnections: { type: 'number', example: 8 },
        idleConnections: { type: 'number', example: 4 },
        waitingClients: { type: 'number', example: 0 },
        maxConnections: { type: 'number', example: 20 },
        minConnections: { type: 'number', example: 5 },
        utilizationRate: { type: 'number', example: 0.4 },
      },
    },
  })
  async getPoolStats(): Promise<any> {
    return await this.poolMonitor.getPoolStats();
  }

  @Get('info')
  @ApiOperation({ summary: '获取数据库详细信息' })
  @ApiResponse({ 
    status: 200, 
    description: '返回数据库版本和配置信息',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string', example: 'PostgreSQL 15.0' },
        databaseName: { type: 'string', example: 'customer_label' },
        host: { type: 'string', example: 'localhost' },
        port: { type: 'number', example: 5432 },
        poolStats: {
          type: 'object',
          properties: {
            totalConnections: { type: 'number' },
            activeConnections: { type: 'number' },
            idleConnections: { type: 'number' },
            utilizationRate: { type: 'number' },
          },
        },
      },
    },
  })
  async getDatabaseInfo(): Promise<any> {
    return await this.poolMonitor.getDatabaseInfo();
  }
}
