import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisService } from './redis.service';

describe('CacheService', () => {
  let cacheService: CacheService;
  let redisService: RedisService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    mget: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
    redisService = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(cacheService).toBeDefined();
  });

  describe('get', () => {
    it('should return value from Redis', async () => {
      const mockValue = { key: 'value' };
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockValue));

      const result = await cacheService.get('test:key');

      expect(result).toEqual(mockValue);
      expect(redisService.get).toHaveBeenCalledWith('test:key');
    });

    it('should return null if key does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent:key');

      expect(result).toBeNull();
    });

    it('should parse JSON string correctly', async () => {
      const mockData = { id: 1, name: 'test' };
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await cacheService.get('test:key');

      expect(result).toEqual(mockData);
    });
  });

  describe('set', () => {
    it('should set value in Redis with TTL', async () => {
      const mockValue = { key: 'value' };
      mockRedisService.set.mockResolvedValue('OK');

      await cacheService.set('test:key', mockValue, 3600);

      expect(redisService.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify(mockValue),
        3600
      );
    });

    it('should handle plain string values', async () => {
      mockRedisService.set.mockResolvedValue('OK');

      await cacheService.set('test:key', 'plain string', 1800);

      expect(redisService.set).toHaveBeenCalledWith('test:key', '"plain string"', 1800);
    });

    it('should work without explicit TTL (default)', async () => {
      const mockValue = { data: 'test' };
      
      await cacheService.set('test:key', mockValue);

      expect(redisService.set).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete key from Redis', async () => {
      mockRedisService.del.mockResolvedValue(1);

      const result = await cacheService.delete('test:key');

      expect(result).toBe(1);
      expect(redisService.del).toHaveBeenCalledWith('test:key');
    });

    it('should return 0 if key does not exist', async () => {
      mockRedisService.del.mockResolvedValue(0);

      const result = await cacheService.delete('nonexistent:key');

      expect(result).toBe(0);
    });
  });

  describe('mget', () => {
    it('should return array of values for multiple keys', async () => {
      const mockValues = ['{"id":1}', '{"id":2}', null];
      mockRedisService.mget.mockResolvedValue(mockValues);

      const result = await cacheService.mget(['key1', 'key2', 'key3']);

      expect(result).toEqual([{ id: 1 }, { id: 2 }, null]);
      expect(redisService.mget).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
    });

    it('should handle empty keys array', async () => {
      mockRedisService.mget.mockResolvedValue([]);

      const result = await cacheService.mget([]);

      expect(result).toEqual([]);
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedisService.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test:key');

      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockRedisService.exists.mockResolvedValue(0);

      const result = await cacheService.exists('nonexistent:key');

      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    it('should set expiration on key', async () => {
      mockRedisService.expire.mockResolvedValue(1);

      const result = await cacheService.expire('test:key', 3600);

      expect(result).toBe(1);
      expect(redisService.expire).toHaveBeenCalledWith('test:key', 3600);
    });
  });

  describe('ttl', () => {
    it('should return TTL for key', async () => {
      mockRedisService.ttl.mockResolvedValue(1800);

      const result = await cacheService.ttl('test:key');

      expect(result).toBe(1800);
    });

    it('should return -1 if key has no expiration', async () => {
      mockRedisService.ttl.mockResolvedValue(-1);

      const result = await cacheService.ttl('test:key');

      expect(result).toBe(-1);
    });

    it('should return -2 if key does not exist', async () => {
      mockRedisService.ttl.mockResolvedValue(-2);

      const result = await cacheService.ttl('nonexistent:key');

      expect(result).toBe(-2);
    });
  });

  describe('wrap', () => {
    const mockKey = 'cache:key';
    const mockTtl = 3600;
    const mockData = { id: 1, name: 'test data' };

    it('should return cached value if exists', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockData));

      const callback = jest.fn();
      const result = await cacheService.wrap(mockKey, callback, mockTtl);

      expect(result).toEqual(mockData);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should call callback and cache result if not in cache', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const callback = jest.fn().mockResolvedValue(mockData);
      const result = await cacheService.wrap(mockKey, callback, mockTtl);

      expect(result).toEqual(mockData);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(redisService.set).toHaveBeenCalledWith(
        mockKey,
        JSON.stringify(mockData),
        mockTtl
      );
    });

    it('should handle null/undefined from callback', async () => {
      mockRedisService.get.mockResolvedValue(null);
      
      const callback = jest.fn().mockResolvedValue(null);
      const result = await cacheService.wrap(mockKey, callback, mockTtl);

      expect(result).toBeNull();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('should clear all caches', async () => {
      // Mock scan method if it exists
      mockRedisService.get.mockImplementation(() => {
        throw new Error('Not implemented');
      });

      // Should not throw error
      await expect(cacheService.clear()).resolves.not.toThrow();
    });
  });
});
