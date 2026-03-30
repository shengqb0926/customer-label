import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisService } from '../redis/redis.service';

describe('CacheService', () => {
  let service: CacheService;
  let redisService: RedisService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
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

    service = module.get<CacheService>(CacheService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockRedisService.get.mockResolvedValue(
        JSON.stringify({ data: mockData, timestamp: Date.now(), ttl: 3600 })
      );

      const getterMock = jest.fn().mockResolvedValue({ id: 2, name: 'New' });

      const result = await service.getOrSet('test:key', getterMock);

      expect(result).toEqual(mockData);
      expect(getterMock).not.toHaveBeenCalled();
      expect(redisService.get).toHaveBeenCalledWith('test:key');
    });

    it('should execute getter and cache result on cache miss', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);

      const getterMock = jest.fn().mockResolvedValue(mockData);

      const result = await service.getOrSet('test:key', getterMock, 1800);

      expect(result).toEqual(mockData);
      expect(getterMock).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should throw error if getter fails', async () => {
      mockRedisService.get.mockResolvedValue(null);
      
      const getterMock = jest.fn().mockRejectedValue(new Error('Getter failed'));

      await expect(service.getOrSet('test:key', getterMock)).rejects.toThrow('Getter failed');
    });
  });

  describe('mset', () => {
    it('should batch set cache entries from Map', async () => {
      const entries = new Map<string, any>([
        ['key1', { id: 1 }],
        ['key2', { id: 2 }],
      ]);

      await service.mset(entries, 3600);

      expect(redisService.set).toHaveBeenCalledTimes(2);
    });

    it('should batch set cache entries from Record', async () => {
      const entries = {
        key1: { id: 1 },
        key2: { id: 2 },
      };

      await service.mset(entries, 3600);

      expect(redisService.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteByPattern', () => {
    it('should delete keys matching pattern', async () => {
      mockRedisService.get.mockResolvedValue(null);
      (redisService as any).keys = jest.fn().mockResolvedValue(['test:1', 'test:2', 'test:3']);
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.deleteByPattern('test:*');

      expect(result).toBe(3);
      expect(mockRedisService.del).toHaveBeenCalledTimes(3);
    });

    it('should return 0 when no keys match pattern', async () => {
      (redisService as any).keys = jest.fn().mockResolvedValue([]);

      const result = await service.deleteByPattern('test:*');

      expect(result).toBe(0);
      expect(mockRedisService.del).not.toHaveBeenCalled();
    });
  });

  describe('deleteBatch', () => {
    it('should batch delete keys', async () => {
      mockRedisService.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.deleteBatch(['key1', 'key2']);

      expect(result).toBe(2);
      expect(mockRedisService.del).toHaveBeenCalledTimes(2);
    });

    it('should skip non-existing keys', async () => {
      mockRedisService.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.deleteBatch(['key1', 'key2']);

      expect(result).toBe(1);
      expect(mockRedisService.del).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHitRate', () => {
    it('should calculate hit rate correctly', async () => {
      // Reset stats first
      service.resetStats();
      
      // First call - cache miss
      mockRedisService.get.mockResolvedValue(null);
      await service.get('key1');
      
      // Second call - cache hit
      mockRedisService.get.mockResolvedValue(JSON.stringify({ data: { id: 1 }, timestamp: Date.now(), ttl: 3600 }));
      await service.get('key2');
      
      const hitRate = service.getHitRate();
      
      // 1 miss + 1 hit = 2 total, hit rate = 1/2 = 0.5
      expect(hitRate).toBeCloseTo(0.5, 2);
    });

    it('should return 0 when no operations', () => {
      service.resetStats();
      expect(service.getHitRate()).toBe(0);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', async () => {
      // Perform some operations
      await service.get('test');
      await service.getOrSet('test2', async () => ({ id: 1 }));

      service.resetStats();

      expect(service.getHitRate()).toBe(0);
    });
  });
});
