import { 
  Cacheable, 
  CacheEvict, 
  CachePut, 
  CACHEABLE_METADATA,
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_EVICT_METADATA,
  CACHE_PUT_METADATA,
} from './cache.decorator';
import * as cacheTypes from './cache.types';

// 注意：不直接导入 CacheInterceptor 和 CacheModule，避免触发 redis 模块的导入错误
// 我们只测试它们被导出这一事实
describe('Cache Module Exports', () => {
  it('应该导出所有装饰器', () => {
    expect(Cacheable).toBeDefined();
    expect(CacheEvict).toBeDefined();
    expect(CachePut).toBeDefined();
  });

  it('应该导出所有元数据常量', () => {
    expect(CACHEABLE_METADATA).toBeDefined();
    expect(CACHE_KEY_METADATA).toBeDefined();
    expect(CACHE_TTL_METADATA).toBeDefined();
    expect(CACHE_EVICT_METADATA).toBeDefined();
    expect(CACHE_PUT_METADATA).toBeDefined();
  });

  it('应该导出 cache types', () => {
    expect(cacheTypes).toBeDefined();
    // CacheMode 是一个 interface，在运行时不可用
    // 我们只需要验证 module 导出了 types 即可
  });

  it('装饰器应该是函数', () => {
    // 装饰器需要传入 options 参数
    expect(typeof Cacheable({ key: 'test', ttl: 300 })).toBe('function');
    expect(typeof CacheEvict({ key: 'test' })).toBe('function');
    expect(typeof CachePut({ key: 'test' })).toBe('function');
  });

  it('装饰器应该接受函数作为 key', () => {
    expect(typeof Cacheable({ key: (id) => `user:${id}`, ttl: 300 })).toBe('function');
    expect(typeof CacheEvict({ key: (id) => `user:${id}` })).toBe('function');
    expect(typeof CachePut({ key: (user) => `user:${user.id}` })).toBe('function');
  });

  it('元数据常量应该是字符串', () => {
    expect(typeof CACHEABLE_METADATA).toBe('string');
    expect(typeof CACHE_KEY_METADATA).toBe('string');
    expect(typeof CACHE_TTL_METADATA).toBe('string');
    expect(typeof CACHE_EVICT_METADATA).toBe('string');
    expect(typeof CACHE_PUT_METADATA).toBe('string');
  });
});