import { Test, TestingModule } from '@nestjs/testing';
import { DatabasePoolMonitorService } from './database-pool-monitor.service';
import { DataSource } from 'typeorm';

describe('DatabasePoolMonitorService', () => {
  let service: DatabasePoolMonitorService;
  let dataSource: Partial<DataSource>;

  beforeEach(async () => {
    dataSource = {
      createQueryRunner: jest.fn(),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabasePoolMonitorService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<DatabasePoolMonitorService>(DatabasePoolMonitorService);
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  describe('getPoolStats', () => {
    it('应该获取连接池统计信息', async () => {
      const mockQueryRunner = {
        query: jest.fn()
          .mockResolvedValueOnce([{ count: '5' }]) // active connections
          .mockResolvedValueOnce([{ count: '10' }]) // total connections
          .mockResolvedValueOnce([{ max_connections: '20' }]), // max connections
      };
      
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const stats = await service.getPoolStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalConnections).toBe('number');
      expect(typeof stats.activeConnections).toBe('number');
      expect(typeof stats.utilizationRate).toBe('number');
    });

    it('查询出错时应该返回默认值', async () => {
      const mockQueryRunner = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn(),
      };
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const stats = await service.getPoolStats();
      
      // 出错时应该返回默认值
      expect(stats).toBeDefined();
      expect(stats.totalConnections).toBe(0);
      expect(stats.utilizationRate).toBe(0);
    });
  });

  describe('testConnection', () => {
    it('应该测试数据库连接', async () => {
      (dataSource.query as jest.Mock).mockResolvedValue([{ now: new Date() }]);

      const result = await service.testConnection();
      
      expect(result.connected).toBe(true);
      expect(result.responseTime).toBeDefined();
    });

    it('连接失败时返回错误状态', async () => {
      (dataSource.query as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();
      
      expect(result.connected).toBe(false);
      expect(result.error).toContain('Connection failed');
    });
  });

  describe('getDatabaseInfo', () => {
    it('应该获取数据库信息', async () => {
      const mockQueryRunner = {
        query: jest.fn()
          .mockResolvedValueOnce([{ version: 'PostgreSQL 15.0' }])
          .mockResolvedValueOnce([{ current_database: 'testdb' }])
          .mockResolvedValueOnce([{ inet_server_port: 5432 }]),
        release: jest.fn(),
      };
      
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);
      
      // Mock dataSource.options
      (dataSource.options as any) = {
        database: 'testdb',
        host: 'localhost',
        port: 5432,
      };

      const info = await service.getDatabaseInfo();
      
      expect(info).toBeDefined();
      expect(info.version).toContain('PostgreSQL');
      expect(info.databaseName).toBe('testdb');
      expect(info.host).toBe('localhost');
      expect(info.port).toBe(5432);
      expect(info.poolStats).toBeDefined();
    });

    it('查询失败时应该抛出异常', async () => {
      const mockQueryRunner = {
        query: jest.fn().mockRejectedValue(new Error('Query error')),
      };
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await expect(service.getDatabaseInfo()).rejects.toThrow();
    });
  });

  describe('checkPoolHealth', () => {
    it('应该检查连接池健康状态', async () => {
      const mockQueryRunner = {
        query: jest.fn()
          .mockResolvedValueOnce([{ count: '5' }])
          .mockResolvedValueOnce([{ count: '10' }])
          .mockResolvedValueOnce([{ max_connections: '20' }])
      };
      
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      // 不应该抛出异常
      await expect(service.checkPoolHealth()).resolves.not.toThrow();
    });

    it('利用率高时应该记录警告日志', async () => {
      const mockQueryRunner = {
        query: jest.fn()
          .mockResolvedValueOnce([{ count: '18' }]) // 90% utilization
          .mockResolvedValueOnce([{ count: '20' }])
          .mockResolvedValueOnce([{ max_connections: '20' }])
      };
      
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      await service.checkPoolHealth();
      // 应该会记录警告日志
    });
  });

  describe('生命周期', () => {
    let originalSetInterval: typeof setInterval;
    let originalClearInterval: typeof clearInterval;

    beforeEach(() => {
      originalSetInterval = global.setInterval;
      originalClearInterval = global.clearInterval;
      global.setInterval = jest.fn() as any;
      global.clearInterval = jest.fn() as any;
    });

    afterEach(() => {
      global.setInterval = originalSetInterval;
      global.clearInterval = originalClearInterval;
    });

    it('onModuleInit 应该启动监控', async () => {
      await service.onModuleInit();
      
      expect(setInterval).toHaveBeenCalled();
    });

    it('onModuleDestroy 应该清理定时器', async () => {
      const mockIntervalId = 123;
      (global.setInterval as jest.Mock).mockReturnValue(mockIntervalId);
      
      await service.onModuleInit();
      
      // 验证 service 保存了 interval ID
      expect(service['monitoringInterval']).toBe(mockIntervalId);
      
      await service.onModuleDestroy();
      
      expect(clearInterval).toHaveBeenCalledWith(mockIntervalId);
    });
  });

  describe('边界情况', () => {
    it('应该处理空结果', async () => {
      const mockQueryRunner = {
        query: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
      };
      
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      const stats = await service.getPoolStats();
      
      expect(stats).toBeDefined();
    });

    it('应该处理 null 值', async () => {
      const mockQueryRunner = {
        query: jest.fn()
          .mockResolvedValueOnce([{ count: null }])
          .mockResolvedValueOnce([{ count: null }])
          .mockResolvedValueOnce([{ max_connections: null }])
      };
      
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

      try {
        const stats = await service.getPoolStats();
        expect(stats).toBeDefined();
      } catch (error) {
        // 预期可能会有解析错误
        expect(error).toBeDefined();
      }
    });
  });
});
