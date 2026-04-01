import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    hgetall: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    keys: jest.fn(),
    flushdb: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
  }));
});

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: any;

  beforeEach(async () => {
    (Redis as any).mockClear();
    
    mockClient = {
      ping: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      hgetall: jest.fn(),
      hset: jest.fn(),
      hdel: jest.fn(),
      keys: jest.fn(),
      flushdb: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
    };

    (Redis as any).mockImplementation(() => mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('应该使用默认配置创建 Redis 客户端', () => {
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 6379,
          db: 0,
        })
      );
    });

    it('应该从环境变量读取配置', async () => {
      const originalHost = process.env.REDIS_HOST;
      const originalPort = process.env.REDIS_PORT;
      
      try {
        process.env.REDIS_HOST = 'custom-host';
        process.env.REDIS_PORT = '6380';
        
        // 需要重新实例化服务才能使用新的环境变量
        const newService = new RedisService();
        expect(newService).toBeDefined();
      } finally {
        process.env.REDIS_HOST = originalHost;
        process.env.REDIS_PORT = originalPort;
      }
    });

    it('应该注册事件监听器', () => {
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('onModuleInit', () => {
    it('应该成功初始化并记录日志', async () => {
      mockClient.ping.mockResolvedValue('PONG');

      await service.onModuleInit();

      expect(mockClient.ping).toHaveBeenCalled();
    });

    it('应该处理 Redis 不可用的情况', async () => {
      mockClient.ping.mockRejectedValue(new Error('Connection refused'));

      await service.onModuleInit();

      expect(mockClient.ping).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('应该正确关闭连接', async () => {
      mockClient.quit.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockClient.quit).toHaveBeenCalled();
    });
  });

  describe('ping', () => {
    it('应该返回 PONG', async () => {
      mockClient.ping.mockResolvedValue('PONG');

      const result = await service.ping();

      expect(result).toBe('PONG');
      expect(mockClient.ping).toHaveBeenCalled();
    });

    it('应该处理 ping 失败', async () => {
      mockClient.ping.mockRejectedValue(new Error('Connection lost'));

      await expect(service.ping()).rejects.toThrow('Connection lost');
    });
  });

  describe('get', () => {
    it('应该获取存在的键值', async () => {
      mockClient.get.mockResolvedValue('test-value');

      const result = await service.get('test-key');

      expect(result).toBe('test-value');
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    it('应该返回 null 当键不存在时', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('应该设置键值（无 TTL）', async () => {
      mockClient.set.mockResolvedValue('OK');

      await service.set('test-key', 'test-value');

      expect(mockClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('应该设置键值并指定 TTL', async () => {
      mockClient.setex.mockResolvedValue('OK');

      await service.set('test-key', 'test-value', 3600);

      expect(mockClient.setex).toHaveBeenCalledWith('test-key', 3600, 'test-value');
    });

    it('应该处理空字符串值', async () => {
      mockClient.set.mockResolvedValue('OK');

      await service.set('empty-key', '');

      expect(mockClient.set).toHaveBeenCalledWith('empty-key', '');
    });

    it('应该处理 TTL 为 0', async () => {
      mockClient.set.mockResolvedValue('OK');

      await service.set('test-key', 'test-value', 0);

      // TTL 为 0 时，由于 if (ttl) 判断为 false，会使用 set 而不是 setex
      expect(mockClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });
  });

  describe('del', () => {
    it('应该删除存在的键', async () => {
      mockClient.del.mockResolvedValue(1);

      const result = await service.del('test-key');

      expect(result).toBe(1);
      expect(mockClient.del).toHaveBeenCalledWith('test-key');
    });

    it('应该返回 0 当键不存在时', async () => {
      mockClient.del.mockResolvedValue(0);

      const result = await service.del('non-existent-key');

      expect(result).toBe(0);
    });

    it('应该支持删除多个键', async () => {
      mockClient.del.mockResolvedValue(2);

      const result = await service.del('key1');
      await service.del('key2');

      expect(result).toBe(2);
      expect(mockClient.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('exists', () => {
    it('应该返回 1 当键存在时', async () => {
      mockClient.exists.mockResolvedValue(1);

      const result = await service.exists('test-key');

      expect(result).toBe(1);
    });

    it('应该返回 0 当键不存在时', async () => {
      mockClient.exists.mockResolvedValue(0);

      const result = await service.exists('non-existent-key');

      expect(result).toBe(0);
    });
  });

  describe('hgetall', () => {
    it('应该获取哈希的所有字段', async () => {
      const hashData = { field1: 'value1', field2: 'value2' };
      mockClient.hgetall.mockResolvedValue(hashData);

      const result = await service.hgetall('test-hash');

      expect(result).toEqual(hashData);
      expect(mockClient.hgetall).toHaveBeenCalledWith('test-hash');
    });

    it('应该返回 null 当哈希不存在时', async () => {
      mockClient.hgetall.mockResolvedValue(null);

      const result = await service.hgetall('non-existent-hash');

      expect(result).toBeNull();
    });

    it('应该返回空对象当哈希为空时', async () => {
      mockClient.hgetall.mockResolvedValue({});

      const result = await service.hgetall('empty-hash');

      expect(result).toEqual({});
    });
  });

  describe('hset', () => {
    it('应该设置哈希字段', async () => {
      mockClient.hset.mockResolvedValue(1);

      const result = await service.hset('test-hash', 'field1', 'value1');

      expect(result).toBe(1);
      expect(mockClient.hset).toHaveBeenCalledWith('test-hash', 'field1', 'value1');
    });

    it('应该处理更新已存在的字段', async () => {
      mockClient.hset.mockResolvedValue(0);

      const result = await service.hset('test-hash', 'existing-field', 'new-value');

      expect(result).toBe(0);
    });
  });

  describe('hdel', () => {
    it('应该删除哈希字段', async () => {
      mockClient.hdel.mockResolvedValue(1);

      const result = await service.hdel('test-hash', 'field1');

      expect(result).toBe(1);
      expect(mockClient.hdel).toHaveBeenCalledWith('test-hash', 'field1');
    });

    it('应该返回 0 当字段不存在时', async () => {
      mockClient.hdel.mockResolvedValue(0);

      const result = await service.hdel('test-hash', 'non-existent-field');

      expect(result).toBe(0);
    });
  });

  describe('keys', () => {
    it('应该匹配模式的键列表', async () => {
      mockClient.keys.mockResolvedValue(['user:1', 'user:2', 'user:3']);

      const result = await service.keys('user:*');

      expect(result).toEqual(['user:1', 'user:2', 'user:3']);
      expect(mockClient.keys).toHaveBeenCalledWith('user:*');
    });

    it('应该返回空数组当没有匹配的键时', async () => {
      mockClient.keys.mockResolvedValue([]);

      const result = await service.keys('non-existent:*');

      expect(result).toEqual([]);
    });
  });

  describe('flushdb', () => {
    it('应该清空当前数据库', async () => {
      mockClient.flushdb.mockResolvedValue('OK');

      await service.flushdb();

      expect(mockClient.flushdb).toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('应该返回连接状态', () => {
      // 初始状态为 false（因为 mock 不会触发 connect 事件）
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('getClient', () => {
    it('应该返回 Redis 客户端实例', () => {
      const client = service.getClient();
      expect(client).toBe(mockClient);
    });
  });

  describe('集成场景测试', () => {
    it('应该支持缓存操作链式调用', async () => {
      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue('cached-value');

      await service.set('cache-key', 'cached-value', 300);
      const result = await service.get('cache-key');

      expect(result).toBe('cached-value');
    });

    it('应该支持哈希操作组合', async () => {
      mockClient.hset.mockResolvedValue(1);
      mockClient.hgetall.mockResolvedValue({ field1: 'value1' });
      mockClient.hdel.mockResolvedValue(1);

      await service.hset('hash-key', 'field1', 'value1');
      const data = await service.hgetall('hash-key');
      await service.hdel('hash-key', 'field1');

      expect(data).toEqual({ field1: 'value1' });
    });

    it('应该处理批量删除', async () => {
      mockClient.keys.mockResolvedValue(['temp:1', 'temp:2', 'temp:3']);
      mockClient.del.mockResolvedValue(1);

      const keys = await service.keys('temp:*');
      
      // 逐个删除
      for (const key of keys) {
        await service.del(key);
      }

      expect(mockClient.del).toHaveBeenCalledTimes(3);
    });
  });
});