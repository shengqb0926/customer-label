import { RedisModule } from './redis.module';
import { RedisService } from './redis.service';
import { CacheService } from './cache.service';

describe('Redis Module Exports', () => {
  it('应该导出 RedisModule', () => {
    expect(RedisModule).toBeDefined();
    expect(typeof RedisModule).toBe('function');
  });

  it('应该导出 RedisService', () => {
    expect(RedisService).toBeDefined();
    expect(typeof RedisService).toBe('function');
  });

  it('应该导出 CacheService', () => {
    expect(CacheService).toBeDefined();
    expect(typeof CacheService).toBe('function');
  });

  it('RedisModule 应该是一个有效的 NestJS 模块类', () => {
    // 验证类的存在性
    expect(RedisModule.toString()).toContain('class');
  });

  it('RedisService 和 CacheService 应该是不同的类', () => {
    expect(RedisService).not.toBe(CacheService);
  });
});