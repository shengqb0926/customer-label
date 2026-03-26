import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  maxConnections: number;
  minConnections: number;
  utilizationRate: number;
}

/**
 * 数据库连接池监控服务
 * 
 * 功能：
 * 1. 实时监控连接池状态
 * 2. 提供连接池统计信息
 * 3. 告警机制（连接数接近上限时）
 * 4. 健康检查接口
 */
@Injectable()
export class DatabasePoolMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabasePoolMonitorService.name);
  private monitoringInterval: NodeJS.Timeout;
  private readonly warningThreshold = 0.8; // 利用率超过 80% 告警
  private readonly criticalThreshold = 0.9; // 利用率超过 90% 严重告警

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // 启动定期监控（每 30 秒）
    this.monitoringInterval = setInterval(() => {
      this.checkPoolHealth();
    }, 30000);

    this.logger.log('Database pool monitor started');
  }

  async onModuleDestroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  /**
   * 获取连接池统计信息
   */
  async getPoolStats(): Promise<PoolStats> {
    try {
      const driver = this.dataSource.driver;
      
      // TypeORM 不直接暴露连接池统计，需要通过底层驱动获取
      // 这里使用 PostgreSQL 的系统视图查询
      const queryRunner = this.dataSource.createQueryRunner();
      
      try {
        // 查询当前活跃连接数
        const activeResult = await queryRunner.query(`
          SELECT count(*) as count 
          FROM pg_stat_activity 
          WHERE datname = current_database() 
          AND state = 'active'
        `);
        
        // 查询总连接数（包括空闲）
        const totalResult = await queryRunner.query(`
          SELECT count(*) as count 
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `);
        
        // 查询最大连接数配置
        const maxConnResult = await queryRunner.query(`
          SHOW max_connections
        `);
        
        const activeConnections = parseInt(activeResult[0]?.count || '0', 10);
        const totalConnections = parseInt(totalResult[0]?.count || '0', 10);
        const maxConnections = parseInt(maxConnResult[0]?.max_connections || '100', 10);
        const idleConnections = totalConnections - activeConnections;
        
        // 估算最小连接数（从环境变量读取）
        const minConnections = parseInt(process.env.DB_POOL_MIN || '5', 10);
        
        // 计算利用率
        const utilizationRate = maxConnections > 0 ? activeConnections / maxConnections : 0;
        
        // 估算等待客户端数（通过活跃连接数和查询队列估算）
        const waitingClients = 0; // TypeORM 不直接暴露此信息
        
        return {
          totalConnections,
          activeConnections,
          idleConnections,
          waitingClients,
          maxConnections,
          minConnections,
          utilizationRate,
        };
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error(`Failed to get pool stats: ${error.message}`);
      
      // 返回默认值
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        maxConnections: parseInt(process.env.DB_POOL_MAX || '20', 10),
        minConnections: parseInt(process.env.DB_POOL_MIN || '5', 10),
        utilizationRate: 0,
      };
    }
  }

  /**
   * 检查连接池健康状态
   */
  async checkPoolHealth(): Promise<void> {
    try {
      const stats = await this.getPoolStats();
      
      if (stats.utilizationRate >= this.criticalThreshold) {
        this.logger.error(
          `[CRITICAL] Database connection pool utilization is critically high: ` +
          `${(stats.utilizationRate * 100).toFixed(1)}% ` +
          `(Active: ${stats.activeConnections}/${stats.maxConnections})`,
        );
      } else if (stats.utilizationRate >= this.warningThreshold) {
        this.logger.warn(
          `[WARNING] Database connection pool utilization is high: ` +
          `${(stats.utilizationRate * 100).toFixed(1)}% ` +
          `(Active: ${stats.activeConnections}/${stats.maxConnections})`,
        );
      } else {
        this.logger.debug(
          `Database pool status: ` +
          `Total: ${stats.totalConnections}, ` +
          `Active: ${stats.activeConnections}, ` +
          `Idle: ${stats.idleConnections}, ` +
          `Utilization: ${(stats.utilizationRate * 100).toFixed(1)}%`,
        );
      }
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * 测试数据库连接
   */
  async testConnection(): Promise<{
    connected: boolean;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      return {
        connected: true,
        responseTime,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * 获取数据库详细信息
   */
  async getDatabaseInfo(): Promise<{
    version: string;
    databaseName: string;
    host: string;
    port: number;
    poolStats: PoolStats;
  }> {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      
      try {
        const versionResult = await queryRunner.query('SELECT version()');
        const version = versionResult[0]?.version || 'Unknown';
        
        const poolStats = await this.getPoolStats();
        
        // 使用类型断言，因为我们知道使用的是 PostgreSQL
        const options = this.dataSource.options as any;
        
        return {
          version,
          databaseName: this.dataSource.options.database as string,
          host: options.host || 'localhost',
          port: options.port || 5432,
          poolStats,
        };
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error(`Failed to get database info: ${error.message}`);
      throw error;
    }
  }
}
