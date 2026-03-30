/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /** 过期时间（秒） */
  ttl?: number;
  /** 缓存前缀 */
  prefix?: string;
}

/**
 * 可缓存的装饰器选项
 */
export interface CacheableOptions<T = any> {
  /** 
   * 缓存键生成策略
   * 可以是字符串模板或函数
   */
  key: string | ((...args: any[]) => string);
  /** 过期时间（秒） */
  ttl?: number;
  /** 缓存前缀 */
  prefix?: string;
  /** 是否忽略参数 */
  ignoreArgs?: boolean;
}

/**
 * 缓存失效事件选项
 */
export interface CacheEvictOptions {
  /** 要删除的缓存键 */
  key?: string | ((...args: any[]) => string);
  /** 要删除的缓存键模式（通配符） */
  pattern?: string;
  /** 是否在方法执行前删除 */
  beforeInvocation?: boolean;
}

/**
 * 缓存更新选项
 */
export interface CachePutOptions extends CacheableOptions {
  /** 条件更新，返回 true 时才更新缓存 */
  condition?: (result: any, ...args: any[]) => boolean;
}

/**
 * 缓存元数据键
 */
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHEABLE_METADATA = 'cache:cacheable';
export const CACHE_EVICT_METADATA = 'cache:evict';
export const CACHE_PUT_METADATA = 'cache:put';
