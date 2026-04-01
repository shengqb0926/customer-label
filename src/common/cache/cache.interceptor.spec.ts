import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { CacheInterceptor } from './cache.interceptor';
import { Reflector } from '@nestjs/core';

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let cacheService: CacheService;
  let reflector: Reflector;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteByPattern: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInterceptor,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<CacheInterceptor>(CacheInterceptor);
    cacheService = module.get<CacheService>(CacheService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should return cached data if available', async () => {
      const mockData = { id: 1, name: 'Test' };
      
      // Setup reflector mocks in correct order
      mockReflector.get
        .mockReturnValueOnce(undefined) // No @CacheEvict
        .mockReturnValueOnce(true) // @Cacheable
        .mockReturnValueOnce((...args: any[]) => `test:${args[0]}`) // key generator
        .mockReturnValueOnce(3600); // ttl
      
      mockCacheService.get.mockResolvedValue(mockData);

      const contextMock = {
        getHandler: jest.fn().mockReturnValue(() => {}),
        getArgs: jest.fn().mockReturnValue([1]),
      };

      const nextMock = {
        handle: jest.fn(),
      };

      const result = await interceptor.intercept(contextMock as any, nextMock as any);

      expect(cacheService.get).toHaveBeenCalledWith('test:1');
      expect(nextMock.handle).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should execute handler and cache result on cache miss', async () => {
      const mockData = { id: 1, name: 'Test' };
      
      // Setup reflector mocks
      mockReflector.get
        .mockReturnValueOnce(undefined) // No @CacheEvict
        .mockReturnValueOnce(true) // @Cacheable
        .mockReturnValueOnce((...args: any[]) => `test:${args[0]}`) // key generator
        .mockReturnValueOnce(3600); // ttl
      
      // Cache miss - return null
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const contextMock = {
        getHandler: jest.fn().mockReturnValue(() => {}),
        getArgs: jest.fn().mockReturnValue([1]),
      };

      // Use real RxJS Observable to properly simulate tap behavior
      const { of } = require('rxjs');
      const handleResult = of(mockData);

      const nextMock = {
        handle: jest.fn().mockReturnValue(handleResult),
      };

      // Call intercept and convert Observable to Promise to trigger execution
      const result = await interceptor.intercept(contextMock as any, nextMock as any);
      
      // Convert the returned Observable to Promise to ensure tap operator executes
      if (result && typeof result.toPromise === 'function') {
        await result.toPromise();
      }

      expect(cacheService.get).toHaveBeenCalledWith('test:1');
      // The set should be called after processing the result
      expect(cacheService.set).toHaveBeenCalled();
      expect(nextMock.handle).toHaveBeenCalled();
    });

    it('should evict cache when @CacheEvict is used', async () => {
      mockReflector.get.mockReturnValueOnce({ key: (id: number) => `test:${id}` }); // @CacheEvict options

      const contextMock = {
        getHandler: jest.fn().mockReturnValue(() => {}),
        getArgs: jest.fn().mockReturnValue([1]),
      };

      const nextMock = {
        handle: jest.fn().mockReturnValue({
          pipe: jest.fn().mockReturnThis(),
          subscribe: jest.fn(),
        }),
      };

      await interceptor.intercept(contextMock as any, nextMock as any);

      expect(cacheService.delete).toHaveBeenCalledWith('test:1');
    });

    it('should evict cache by pattern when @CacheEvict has pattern option', async () => {
      mockReflector.get.mockReturnValueOnce({ pattern: 'test:*' }); // @CacheEvict with pattern

      const contextMock = {
        getHandler: jest.fn().mockReturnValue(() => {}),
        getArgs: jest.fn().mockReturnValue([1]),
      };

      const nextMock = {
        handle: jest.fn().mockReturnValue({
          pipe: jest.fn().mockReturnThis(),
          subscribe: jest.fn(),
        }),
      };

      await interceptor.intercept(contextMock as any, nextMock as any);

      expect(cacheService.deleteByPattern).toHaveBeenCalledWith('test:*');
    });
  });
});
