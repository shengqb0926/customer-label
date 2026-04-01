import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseController } from './database.controller';
import { DatabasePoolMonitorService } from './database-pool-monitor.service';

describe('DatabaseController', () => {
  let controller: DatabaseController;
  let poolMonitor: Partial<DatabasePoolMonitorService>;

  beforeEach(async () => {
    poolMonitor = {
      testConnection: jest.fn(),
      getPoolStats: jest.fn(),
      getDatabaseInfo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatabaseController],
      providers: [
        { provide: DatabasePoolMonitorService, useValue: poolMonitor },
      ],
    }).compile();

    controller = module.get<DatabaseController>(DatabaseController);
  });

  it('应该被定义', () => {
    expect(controller).toBeDefined();
  });

  describe('healthCheck', () => {
    it('应该检查数据库健康状态', async () => {
      const result = { connected: true, responseTime: 15 };
      (poolMonitor.testConnection as jest.Mock).mockResolvedValue(result);

      const health = await controller.healthCheck();
      
      expect(poolMonitor.testConnection).toHaveBeenCalled();
      expect(health).toEqual(result);
    });

    it('连接失败时返回错误状态', async () => {
      const result = { 
        connected: false, 
        error: 'Connection timeout' 
      };
      (poolMonitor.testConnection as jest.Mock).mockResolvedValue(result);

      const health = await controller.healthCheck();
      
      expect(health.connected).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  describe('getPoolStats', () => {
    it('应该获取连接池统计', async () => {
      const result = {
        totalConnections: 20,
        activeConnections: 12,
        idleConnections: 8,
        waitingClients: 0,
        maxConnections: 50,
        minConnections: 5,
        utilizationRate: 0.6,
      };
      (poolMonitor.getPoolStats as jest.Mock).mockResolvedValue(result);

      const stats = await controller.getPoolStats();
      
      expect(poolMonitor.getPoolStats).toHaveBeenCalled();
      expect(stats).toEqual(result);
    });

    it('统计信息应该包含所有必需字段', async () => {
      const result = {
        totalConnections: 10,
        activeConnections: 5,
        idleConnections: 5,
        waitingClients: 0,
        maxConnections: 20,
        minConnections: 2,
        utilizationRate: 0.5,
      };
      (poolMonitor.getPoolStats as jest.Mock).mockResolvedValue(result);

      const stats = await controller.getPoolStats();
      
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('idleConnections');
      expect(stats).toHaveProperty('waitingClients');
      expect(stats).toHaveProperty('maxConnections');
      expect(stats).toHaveProperty('minConnections');
      expect(stats).toHaveProperty('utilizationRate');
    });
  });

  describe('getDatabaseInfo', () => {
    it('应该获取数据库信息', async () => {
      const result = {
        version: 'PostgreSQL 15.0',
        databaseName: 'customer_label',
        host: 'localhost',
        port: 5432,
        poolStats: {
          totalConnections: 20,
          activeConnections: 10,
          idleConnections: 10,
          utilizationRate: 0.5,
        },
      };
      (poolMonitor.getDatabaseInfo as jest.Mock).mockResolvedValue(result);

      const info = await controller.getDatabaseInfo();
      
      expect(poolMonitor.getDatabaseInfo).toHaveBeenCalled();
      expect(info).toEqual(result);
    });

    it('数据库信息应该包含版本和配置', async () => {
      const result = {
        version: 'PostgreSQL 14.0',
        databaseName: 'testdb',
        host: '192.168.1.100',
        port: 5432,
      };
      (poolMonitor.getDatabaseInfo as jest.Mock).mockResolvedValue(result);

      const info = await controller.getDatabaseInfo();
      
      expect(info.version).toBeDefined();
      expect(info.databaseName).toBeDefined();
      expect(info.host).toBeDefined();
      expect(info.port).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('healthCheck 出错时应该捕获异常', async () => {
      (poolMonitor.testConnection as jest.Mock).mockRejectedValue(
        new Error('Database unavailable')
      );

      await expect(controller.healthCheck()).rejects.toThrow('Database unavailable');
    });

    it('getPoolStats 出错时应该捕获异常', async () => {
      (poolMonitor.getPoolStats as jest.Mock).mockRejectedValue(
        new Error('Query failed')
      );

      await expect(controller.getPoolStats()).rejects.toThrow('Query failed');
    });

    it('getDatabaseInfo 出错时应该捕获异常', async () => {
      (poolMonitor.getDatabaseInfo as jest.Mock).mockRejectedValue(
        new Error('Connection lost')
      );

      await expect(controller.getDatabaseInfo()).rejects.toThrow('Connection lost');
    });
  });
});
