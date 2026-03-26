import { Module, Global, DynamicModule } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheService } from './cache.service';
import { RedisConfig } from './redis.service';

@Global()
@Module({
  providers: [RedisService, CacheService],
  exports: [RedisService, CacheService],
})
export class RedisModule {
  static forRoot(config?: RedisConfig): DynamicModule {
    return {
      module: RedisModule,
      providers: [RedisService, CacheService],
      exports: [RedisService, CacheService],
    };
  }
}