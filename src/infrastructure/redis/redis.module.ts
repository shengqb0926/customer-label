import { Module, Global, DynamicModule } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisClusterService } from './redis-cluster.service';
import { CacheService } from './cache.service';
import { RedisConfig } from './redis.service';

@Global()
@Module({
  providers: [RedisService, CacheService],
  exports: [RedisService, CacheService],
})
export class RedisModule {
  static forRoot(config?: RedisConfig): DynamicModule {
    const useCluster = process.env.REDIS_CLUSTER_MODE === 'true';
    
    return {
      module: RedisModule,
      providers: useCluster 
        ? [RedisClusterService, CacheService] 
        : [RedisService, CacheService],
      exports: useCluster 
        ? [RedisClusterService, CacheService] 
        : [RedisService, CacheService],
    };
  }
}