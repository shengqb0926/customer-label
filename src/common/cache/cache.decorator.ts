import { SetMetadata, applyDecorators } from '@nestjs/common';
import { CacheableOptions, CacheEvictOptions, CachePutOptions } from './cache.types';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHEABLE_METADATA = 'cache:cacheable';
export const CACHE_EVICT_METADATA = 'cache:evict';
export const CACHE_PUT_METADATA = 'cache:put';

/**
 * @Cacheable 装饰器 - 自动缓存方法返回值
 * 
 * @example
 * ```typescript
 * @Cacheable({ key: (id) => `user:${id}`, ttl: 3600 })
 * async getUser(id: number) { ... }
 * ```
 */
export function Cacheable(options: CacheableOptions): MethodDecorator {
  return applyDecorators(
    SetMetadata(CACHEABLE_METADATA, true),
    SetMetadata(CACHE_KEY_METADATA, options.key),
    SetMetadata(CACHE_TTL_METADATA, options.ttl ?? 3600),
  );
}

/**
 * @CacheEvict 装饰器 - 删除缓存
 * 
 * @example
 * ```typescript
 * @CacheEvict({ key: (id) => `user:${id}` })
 * async deleteUser(id: number) { ... }
 * ```
 */
export function CacheEvict(options: CacheEvictOptions): MethodDecorator {
  return applyDecorators(
    SetMetadata(CACHE_EVICT_METADATA, options),
  );
}

/**
 * @CachePut 装饰器 - 更新缓存
 * 
 * @example
 * ```typescript
 * @CachePut({ key: (user) => `user:${user.id}`, ttl: 3600 })
 * async updateUser(user: User) { ... }
 * ```
 */
export function CachePut(options: CachePutOptions): MethodDecorator {
  return applyDecorators(
    SetMetadata(CACHE_PUT_METADATA, options),
  );
}
