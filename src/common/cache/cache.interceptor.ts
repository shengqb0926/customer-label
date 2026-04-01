import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CacheService } from '../../infrastructure/redis/cache.service';
import {
  CACHEABLE_METADATA,
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_EVICT_METADATA,
  CACHE_PUT_METADATA,
} from './cache.types';

/**
 * 缓存拦截器 - 自动处理 @Cacheable、@CacheEvict、@CachePut 装饰器
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const handler = context.getHandler();

    // 检查是否有 @CacheEvict 装饰器
    const evictOptions = this.reflector.get(CACHE_EVICT_METADATA, handler);
    if (evictOptions) {
      await this.handleCacheEvict(evictOptions, context, handler);
    }

    // 检查是否有 @Cacheable 装饰器
    const isCacheable = this.reflector.get(CACHEABLE_METADATA, handler);
    if (isCacheable) {
      return this.handleCacheable(context, next, handler);
    }

    // 检查是否有 @CachePut 装饰器
    const putOptions = this.reflector.get(CACHE_PUT_METADATA, handler);
    if (putOptions) {
      return this.handleCachePut(context, next, handler, putOptions);
    }

    // 没有缓存装饰器，直接执行
    return next.handle();
  }

  /**
   * 处理 @Cacheable 装饰器
   */
  private async handleCacheable(
    context: ExecutionContext,
    next: CallHandler,
    handler: Function,
  ): Promise<any> {
    const keyGenerator = this.reflector.get(CACHE_KEY_METADATA, handler);
    const ttl = this.reflector.get(CACHE_TTL_METADATA, handler);
    
    const args = context.getArgs();
    const cacheKey = this.generateKey(keyGenerator, args);

    // 尝试从缓存获取
    const cached = await this.cacheService.get(cacheKey);
    if (cached !== null) {
      return of(cached);
    }

    // 执行方法并缓存结果
    return next.handle().pipe(
      tap((result) => {
        if (result !== undefined && result !== null) {
          this.cacheService.set(cacheKey, result, ttl).catch((error) => {
            console.error(`Failed to cache result for key ${cacheKey}:`, error);
          });
        }
      }),
    );
  }

  /**
   * 处理 @CachePut 装饰器
   */
  private async handleCachePut(
    context: ExecutionContext,
    next: CallHandler,
    handler: Function,
    options: any,
  ): Promise<any> {
    return next.handle().pipe(
      tap(async (result) => {
        const condition = options.condition;
        // 检查条件是否满足
        if (condition && typeof condition === 'function') {
          const args = context.getArgs();
          if (!condition(result, ...args)) {
            return;
          }
        }

        const keyGenerator = options.key;
        const args = context.getArgs();
        const cacheKey = this.generateKey(keyGenerator, args);
        
        await this.cacheService.set(cacheKey, result, options.ttl);
      }),
    );
  }

  /**
   * 处理 @CacheEvict 装饰器
   */
  private async handleCacheEvict(
    options: any,
    context: ExecutionContext,
    handler: Function,
  ): Promise<void> {
    const args = context.getArgs();

    // 如果配置为在调用前删除
    if (options.beforeInvocation) {
      await this.performEvict(options, args);
    }

    // 立即执行删除（默认行为）
    if (!options.beforeInvocation) {
      await this.performEvict(options, args);
    }
  }

  /**
   * 执行缓存删除
   */
  private async performEvict(options: any, args: any[]): Promise<void> {
    if (options.pattern) {
      await this.cacheService.deleteByPattern(options.pattern);
    } else if (options.key) {
      const cacheKey = this.generateKey(options.key, args);
      await this.cacheService.delete(cacheKey);
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(keyConfig: string | Function, args: any[]): string {
    if (typeof keyConfig === 'function') {
      return keyConfig(...args);
    }
    return keyConfig;
  }
}
