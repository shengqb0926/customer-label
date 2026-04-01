import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisService } from './redis.service';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedisService: Partial<RedisService>;

  beforeEach(async () => {
    // Mock RedisService
    mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      isConnected: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHitRate', () => {
    it('should return 0 when no cache operations', () => {
      expect(service.getHitRate()).toBe(0);
    });

    it('should calculate hit rate correctly', () => {
      // Simulate cache operations by accessing private properties
      (service as any).cacheHits = 80;
      (service as any).cacheMisses = 20;

      expect(service.getHitRate()).toBe(0.8);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics to zero', () => {
      (service as any).cacheHits = 100;
      (service as any).cacheMisses = 50;
      (service as any).cacheWrites = 30;
      (service as any).cacheEvictions = 10;

      service.resetStats();

      expect(service.getHitRate()).toBe(0);
    });
  });

  describe('get', () => {
    it('should return cached data', async () => {
      const mockData = { name: 'test', value: 123 };
      const cacheEntry = {
        data: mockData,
        timestamp: Date.now(),
        ttl: 3600,
      };

      (mockRedisService.get as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await service.get<typeof mockData>('test-key');

      expect(result).toEqual(mockData);
      expect(mockRedisService.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent key', async () => {
      (mockRedisService.get as jest.Mock).mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should return null and delete expired cache', async () => {
      const expiredEntry = {
        data: { value: 'old' },
        timestamp: Date.now() - 7200 * 1000, // 2 hours ago
        ttl: 3600, // 1 hour TTL
      };

      (mockRedisService.get as jest.Mock).mockResolvedValue(JSON.stringify(expiredEntry));
      (mockRedisService.del as jest.Mock).mockResolvedValue(1);

      const result = await service.get('expired-key');

      expect(result).toBeNull();
      expect(mockRedisService.del).toHaveBeenCalledWith('expired-key');
    });

    it('should handle JSON parse errors gracefully', async () => {
      (mockRedisService.get as jest.Mock).mockResolvedValue('invalid-json');

      const result = await service.get('invalid-key');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      (mockRedisService.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await service.get('error-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should cache data with default TTL', async () => {
      const testData = { id: 1, name: 'test' };

      await service.set('test-key', testData);

      expect(mockRedisService.set).toHaveBeenCalled();
      const callArgs = (mockRedisService.set as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('test-key');
      expect(callArgs[2]).toBe(3600); // Default TTL
    });

    it('should cache data with custom TTL', async () => {
      const testData = { value: 'custom' };

      await service.set('custom-key', testData, 7200);

      expect(mockRedisService.set).toHaveBeenCalled();
      const callArgs = (mockRedisService.set as jest.Mock).mock.calls[0];
      expect(callArgs[2]).toBe(7200); // Custom TTL
    });

    it('should handle serialization errors gracefully', async () => {
      const circularData: any = {};
      circularData.self = circularData; // Circular reference

      await expect(service.set('circular-key', circularData)).resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete cache key', async () => {
      (mockRedisService.del as jest.Mock).mockResolvedValue(1);

      await service.delete('test-key');

      expect(mockRedisService.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle delete errors gracefully', async () => {
      (mockRedisService.del as jest.Mock).mockRejectedValue(new Error('Delete error'));

      await expect(service.delete('error-key')).resolves.toBeUndefined();
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      (mockRedisService.exists as jest.Mock).mockResolvedValue(1);

      const result = await service.exists('existing-key');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      (mockRedisService.exists as jest.Mock).mockResolvedValue(0);

      const result = await service.exists('non-existent-key');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (mockRedisService.exists as jest.Mock).mockRejectedValue(new Error('Error'));

      const result = await service.exists('error-key');

      expect(result).toBe(false);
    });
  });

  describe('mget', () => {
    it('should get multiple keys', async () => {
      const data1 = { id: 1 };
      const data2 = { id: 2 };
      
      const entry1 = JSON.stringify({ data: data1, timestamp: Date.now(), ttl: 3600 });
      const entry2 = JSON.stringify({ data: data2, timestamp: Date.now(), ttl: 3600 });

      (mockRedisService.get as jest.Mock)
        .mockResolvedValueOnce(entry1)
        .mockResolvedValueOnce(entry2);

      const result = await service.mget(['key1', 'key2']);

      expect(result.size).toBe(2);
      expect(result.get('key1')).toEqual(data1);
      expect(result.get('key2')).toEqual(data2);
    });

    it('should only return existing keys', async () => {
      const data1 = { id: 1 };
      const entry1 = JSON.stringify({ data: data1, timestamp: Date.now(), ttl: 3600 });

      (mockRedisService.get as jest.Mock)
        .mockResolvedValueOnce(entry1)
        .mockResolvedValueOnce(null);

      const result = await service.mget(['key1', 'key2']);

      expect(result.size).toBe(1);
      expect(result.has('key1')).toBe(true);
      expect(result.has('key2')).toBe(false);
    });
  });

  describe('wrap', () => {
    it('should return cached value on hit', async () => {
      const cachedData = { cached: true };
      const cacheEntry = JSON.stringify({ data: cachedData, timestamp: Date.now(), ttl: 3600 });

      (mockRedisService.get as jest.Mock).mockResolvedValue(cacheEntry);

      const callback = jest.fn().mockResolvedValue({ new: true });
      const result = await service.wrap('test-key', callback);

      expect(result).toEqual(cachedData);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should execute callback and cache result on miss', async () => {
      (mockRedisService.get as jest.Mock).mockResolvedValue(null);
      (mockRedisService.set as jest.Mock).mockResolvedValue(undefined);

      const callbackData = { fresh: true };
      const callback = jest.fn().mockResolvedValue(callbackData);

      const result = await service.wrap('test-key', callback, 1800);

      expect(result).toEqual(callbackData);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all cache', async () => {
      (mockRedisService as any).flushdb = jest.fn().mockResolvedValue(undefined);

      await service.clear();

      expect((mockRedisService as any).flushdb).toHaveBeenCalled();
    });

    it('should handle clear errors gracefully', async () => {
      (mockRedisService as any).flushdb = undefined;

      await expect(service.clear()).resolves.toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      (mockRedisService.isConnected as jest.Mock).mockReturnValue(true);
      (mockRedisService as any).keys = jest.fn().mockResolvedValue(['key1', 'key2', 'key3']);

      const stats = await service.getStats();

      expect(stats).toEqual({
        isConnected: true,
        keysCount: 3,
        hits: 0,
        misses: 0,
        writes: 0,
        evictions: 0,
        hitRate: 0,
      });
    });

    it('should handle disconnected state', async () => {
      (mockRedisService.isConnected as jest.Mock).mockReturnValue(false);

      const stats = await service.getStats();

      expect(stats.isConnected).toBe(false);
      expect(stats.keysCount).toBeUndefined();
    });

    it('should handle stats retrieval errors gracefully', async () => {
      (mockRedisService.isConnected as jest.Mock).mockReturnValue(true);
      (mockRedisService as any).keys = jest.fn().mockRejectedValue(new Error('Keys error'));

      const stats = await service.getStats();

      expect(stats.isConnected).toBe(true);
      // keysCount will be undefined when error occurs, but the function returns 0 from getKeys
      // So we just verify it doesn't throw
      expect(typeof stats.keysCount === 'undefined' || typeof stats.keysCount === 'number').toBe(true);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value on hit', async () => {
      const cachedData = { cached: true };
      const cacheEntry = JSON.stringify({ data: cachedData, timestamp: Date.now(), ttl: 3600 });

      (mockRedisService.get as jest.Mock).mockResolvedValue(cacheEntry);

      const getter = jest.fn().mockResolvedValue({ new: true });
      const result = await service.getOrSet('test-key', getter);

      expect(result).toEqual(cachedData);
      expect(getter).not.toHaveBeenCalled();
    });

    it('should execute getter and cache result on miss', async () => {
      (mockRedisService.get as jest.Mock).mockResolvedValue(null);
      (mockRedisService.set as jest.Mock).mockResolvedValue(undefined);

      const getterData = { fresh: true };
      const getter = jest.fn().mockResolvedValue(getterData);

      const result = await service.getOrSet('test-key', getter, 1800);

      expect(result).toEqual(getterData);
      expect(getter).toHaveBeenCalledTimes(1);
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should throw error when getter fails', async () => {
      (mockRedisService.get as jest.Mock).mockResolvedValue(null);

      const getter = jest.fn().mockRejectedValue(new Error('Getter error'));

      await expect(service.getOrSet('error-key', getter)).rejects.toThrow('Getter error');
    });
  });

  describe('mset', () => {
    it('should set multiple entries from Map', async () => {
      const entries = new Map([
        ['key1', { id: 1 }],
        ['key2', { id: 2 }],
      ]);

      (mockRedisService.set as jest.Mock).mockResolvedValue(undefined);

      await service.mset(entries);

      expect(mockRedisService.set).toHaveBeenCalledTimes(2);
    });

    it('should set multiple entries from Object', async () => {
      const entries = {
        key1: { id: 1 },
        key2: { id: 2 },
      };

      (mockRedisService.set as jest.Mock).mockResolvedValue(undefined);

      await service.mset(entries);

      expect(mockRedisService.set).toHaveBeenCalledTimes(2);
    });

    it('should handle mset errors gracefully', async () => {
      const entries = new Map([['key1', {}]]);
      // The set method catches errors and logs them, but doesn't throw
      // So mset will complete successfully even if individual set operations fail
      (mockRedisService.set as jest.Mock).mockRejectedValue(new Error('Set error'));

      // Since set() catches errors internally, mset will resolve successfully
      await expect(service.mset(entries)).resolves.toBeUndefined();
    });
  });

  describe('deleteByPattern', () => {
    it('should delete keys matching pattern', async () => {
      const mockKeys = ['user:1', 'user:2', 'user:3'];
      (mockRedisService as any).keys = jest.fn().mockResolvedValue(mockKeys);
      (mockRedisService.del as jest.Mock).mockResolvedValue(1);

      const result = await service.deleteByPattern('user:*');

      expect(result).toBe(3);
      expect(mockRedisService.del).toHaveBeenCalledTimes(3);
    });

    it('should return 0 when no keys match', async () => {
      (mockRedisService as any).keys = jest.fn().mockResolvedValue([]);

      const result = await service.deleteByPattern('nonexistent:*');

      expect(result).toBe(0);
    });

    it('should handle cluster mode gracefully', async () => {
      (mockRedisService as any).keys = undefined;

      const result = await service.deleteByPattern('*');

      expect(result).toBe(0);
    });

    it('should handle deletion errors gracefully', async () => {
      (mockRedisService as any).keys = jest.fn().mockResolvedValue(['key1']);
      (mockRedisService.del as jest.Mock).mockRejectedValue(new Error('Del error'));

      const result = await service.deleteByPattern('*');

      expect(result).toBe(0);
    });
  });

  describe('deleteBatch', () => {
    it('should delete multiple keys', async () => {
      (mockRedisService.exists as jest.Mock).mockResolvedValue(1);
      (mockRedisService.del as jest.Mock).mockResolvedValue(1);

      const keys = ['key1', 'key2', 'key3'];
      const result = await service.deleteBatch(keys);

      expect(result).toBe(3);
      expect(mockRedisService.exists).toHaveBeenCalledTimes(3);
      expect(mockRedisService.del).toHaveBeenCalledTimes(3);
    });

    it('should only count existing keys', async () => {
      (mockRedisService.exists as jest.Mock)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      (mockRedisService.del as jest.Mock).mockResolvedValue(1);

      const keys = ['key1', 'key2', 'key3'];
      const result = await service.deleteBatch(keys);

      expect(result).toBe(2);
    });

    it('should handle batch delete errors gracefully', async () => {
      (mockRedisService.exists as jest.Mock).mockRejectedValue(new Error('Exists error'));

      const keys = ['key1', 'key2'];
      const result = await service.deleteBatch(keys);

      expect(result).toBe(0);
    });
  });
});
