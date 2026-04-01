import { Module, Global } from '@nestjs/common';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { CacheInterceptor } from './cache.interceptor';

/**
 * 缓存模块 - 提供全局缓存服务
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [CacheService, CacheInterceptor],
  exports: [CacheService, CacheInterceptor],
})
export class CacheModule {}
