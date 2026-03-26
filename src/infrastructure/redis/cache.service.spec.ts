import { CacheService } from './cache.service';

describe('CacheService', () => {
  let cacheService: CacheService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    keys: jest.fn(),
    flushdb: jest.fn(),
    isConnected: jest.fn(),
  };

  beforeEach(() => {
    // 直接实例化 CacheService，绕过 NestJS 依赖注入
    cacheService = new (CacheService as any)(mockRedisService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(cacheService).toBeDefined();
  });

  describe('get', () => {
    it('should return value from Redis', async () => {
      const mockValue = { key: 'value' };
      const cacheEntry = JSON.stringify({
        data: mockValue,
        timestamp: Date.now(),
        ttl: 3600,
      });
      mockRedisService.get.mockResolvedValue(cacheEntry);

      const result = await cacheService.get('test:key');

      expect(result).toEqual(mockValue);
      expect(mockRedisService.get).toHaveBeenCalledWith('test:key');
    });

    it('should return null if key does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent:key');

      expect(result).toBeNull();
    });

    it('should parse JSON string correctly', async () => {
      const mockData = { id: 1, name: 'test' };
      const cacheEntry = JSON.stringify({
        data: mockData,
        timestamp: Date.now(),
        ttl: 3600,
      });
      mockRedisService.get.mockResolvedValue(cacheEntry);

      const result = await cacheService.get('test:key');

      expect(result).toEqual(mockData);
    });

    it('should handle errors gracefully', async () => {
      mockRedisService.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('test:key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in Redis with TTL', async () => {
      const mockValue = { key: 'value' };
      mockRedisService.set.mockResolvedValue('OK');

      await cacheService.set('test:key', mockValue, 3600);

      expect(mockRedisService.set).toHaveBeenCalledTimes(1);
      const callArgs = mockRedisService.set.mock.calls[0];
      expect(callArgs[0]).toBe('test:key');
      expect(callArgs[2]).toBe(3600);
      
      const storedEntry = JSON.parse(callArgs[1]);
      expect(storedEntry.data).toEqual(mockValue);
      expect(storedEntry.ttl).toBe(3600);
      expect(storedEntry.timestamp).toBeDefined();
    });

    it('should handle plain string values', async () => {
      mockRedisService.set.mockResolvedValue('OK');

      await cacheService.set('test:key', 'plain string', 1800);

      expect(mockRedisService.set).toHaveBeenCalledTimes(1);
      const callArgs = mockRedisService.set.mock.calls[0];
      expect(callArgs[0]).toBe('test:key');
      expect(callArgs[2]).toBe(1800);
      
      const storedEntry = JSON.parse(callArgs[1]);
      expect(storedEntry.data).toBe('plain string');
      expect(storedEntry.ttl).toBe(1800);
    });

    it('should work without explicit TTL (default)', async () => {
      const mockValue = { data: 'test' };
      
      await cacheService.set('test:key', mockValue);

      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedisService.set.mockRejectedValue(new Error('Redis error'));

      await cacheService.set('test:key', { data: 'test' });

      expect(true).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete key from Redis', async () => {
      mockRedisService.del.mockResolvedValue(1);

      await cacheService.delete('test:key');

      expect(mockRedisService.del).toHaveBeenCalledWith('test:key');
    });

    it('should handle errors gracefully', async () => {
      mockRedisService.del.mockRejectedValue(new Error('Redis error'));

      await cacheService.delete('test:key');

      expect(true).toBe(true);
    });
  });

  describe('mget', () => {
    it('should return Map of values for multiple keys', async () => {
      const cacheEntry1 = JSON.stringify({ data: { id: 1 }, timestamp: Date.now(), ttl: 3600 });
      const cacheEntry2 = JSON.stringify({ data: { id: 2 }, timestamp: Date.now(), ttl: 3600 });
      
      mockRedisService.get
        .mockResolvedValueOnce(cacheEntry1)
        .mockResolvedValueOnce(cacheEntry2)
        .mockResolvedValueOnce(null);

      const result = await cacheService.mget(['key1', 'key2', 'key3']);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('key1')).toEqual({ id: 1 });
      expect(result.get('key2')).toEqual({ id: 2 });
      expect(result.has('key3')).toBe(false);
    });

    it('should handle empty keys array', async () => {
      const result = await cacheService.mget([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should handle all keys missing', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await cacheService.mget(['key1', 'key2']);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedisService.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test:key');

      expect(result).toBe(true);
      expect(mockRedisService.exists).toHaveBeenCalledWith('test:key');
    });

    it('should return false if key does not exist', async () => {
      mockRedisService.exists.mockResolvedValue(0);

      const result = await cacheService.exists('nonexistent:key');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockRedisService.exists.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.exists('test:key');

      expect(result).toBe(false);
    });
  });

  describe('wrap', () => {
    const mockKey = 'cache:key';
    const mockTtl = 3600;
    const mockData = { id: 1, name: 'test data' };
    const mockCacheEntry = JSON.stringify({
      data: mockData,
      timestamp: Date.now(),
      ttl: mockTtl,
    });

    it('should return cached value if exists', async () => {
      mockRedisService.get.mockResolvedValue(mockCacheEntry);

      const result = await cacheService.wrap(mockKey, async () => mockData, mockTtl);

      expect(result).toEqual(mockData);
      expect(mockRedisService.get).toHaveBeenCalledWith(mockKey);
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('should execute callback and cache result if not cached', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const callback = jest.fn().mockResolvedValue(mockData);
      const result = await cacheService.wrap(mockKey, callback, mockTtl);

      expect(result).toEqual(mockData);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should use default TTL when not specified', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      await cacheService.wrap(mockKey, async () => ({ data: 'test' }));

      expect(mockRedisService.set).toHaveBeenCalledWith(
        mockKey,
        expect.any(String),
        3600
      );
    });
  });

  describe('clear', () => {
    it('should clear all cache', async () => {
      mockRedisService.flushdb.mockResolvedValue('OK');

      await cacheService.clear();

      expect(mockRedisService.flushdb).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedisService.flushdb.mockRejectedValue(new Error('Redis error'));

      await cacheService.clear();

      expect(true).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      mockRedisService.isConnected.mockReturnValue(true);
      mockRedisService.keys.mockResolvedValue(['key1', 'key2', 'key3']);

      const result = await cacheService.getStats();

      expect(result).toEqual({
        isConnected: true,
        keysCount: 3,
        hits: 0,
        misses: 0,
        writes: 0,
        evictions: 0,
        hitRate: 0,
      });
    });

    it('should return disconnected status', async () => {
      mockRedisService.isConnected.mockReturnValue(false);

      const result = await cacheService.getStats();

      expect(result).toEqual({
        isConnected: false,
        keysCount: undefined,
        hits: 0,
        misses: 0,
        writes: 0,
        evictions: 0,
        hitRate: 0,
      });
    });

    it('should handle errors gracefully', async () => {
      mockRedisService.isConnected.mockReturnValue(true);
      mockRedisService.keys.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.getStats();

      expect(result).toEqual({
        isConnected: true,
        keysCount: 0,
        hits: 0,
        misses: 0,
        writes: 0,
        evictions: 0,
        hitRate: 0,
      });
    });
  });
});
