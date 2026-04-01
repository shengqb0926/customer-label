import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 3600; // 1 hour
  
  // 缓存性能指标
  private cacheHits = 0;
  private cacheMisses = 0;
  private cacheWrites = 0;
  private cacheEvictions = 0; // 过期清理次数

  constructor(private readonly redis: RedisService) {}

  /**
   * 获取缓存命中率
   */
  getHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    if (total === 0) return 0;
    return this.cacheHits / total;
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheWrites = 0;
    this.cacheEvictions = 0;
  }

  /**
   * 获取缓存数据
   * @param key 缓存键
   * @returns 缓存的数据，如果不存在或已过期则返回 null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        this.cacheMisses++;
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // 检查是否过期
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl * 1000) {
        await this.redis.del(key);
        this.cacheMisses++;
        this.cacheEvictions++;
        return null;
      }

      this.cacheHits++;
      return entry.data;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param data 要缓存的数据
   * @param ttl 过期时间（秒），默认 3600 秒
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
      };

      await this.redis.set(key, JSON.stringify(entry), ttl || this.defaultTTL);
      this.logger.debug(`Cache SET: ${key}, TTL: ${ttl || this.defaultTTL}s`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Cache DELETE: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DELETE error for key ${key}:`, error);
    }
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   */
  async exists(key: string): Promise<boolean> {
    try {
      const count = await this.redis.exists(key);
      return count > 0;
    } catch (error) {
      this.logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 批量获取缓存
   * @param keys 缓存键数组
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    
    for (const key of keys) {
      const data = await this.get<T>(key);
      if (data !== null) {
        result.set(key, data);
      }
    }
    
    return result;
  }

  /**
   * 缓存包装器 - 如果缓存未命中则执行回调并缓存结果
   * @param key 缓存键
   * @param callback 回调函数
   * @param ttl 过期时间
   */
  async wrap<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T> {
    // 先尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache HIT: ${key}`);
      return cached;
    }

    // 缓存未命中，执行回调
    this.logger.debug(`Cache MISS: ${key}, executing callback...`);
    const data = await callback();
    
    // 缓存结果
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    try {
      // 使用 flushdb 清空数据库
      if ('flushdb' in this.redis) {
        await (this.redis as any).flushdb();
      }
      this.logger.warn('Cache cleared');
    } catch (error) {
      this.logger.error('Cache CLEAR error:', error);
    }
  }

  /**
   * 获取键（支持通配符）
   */
  private async getKeys(pattern: string): Promise<string[]> {
    try {
      if ('keys' in this.redis) {
        return await (this.redis as any).keys(pattern);
      }
      // 集群模式不支持 keys 命令，返回空数组
      this.logger.warn('Keys command not supported in cluster mode');
      return [];
    } catch (error) {
      this.logger.error('Failed to get keys:', error);
      return [];
    }
  }

  /**
   * 获取缓存统计信息（包含命中率）
   */
  async getStats(): Promise<{
    isConnected: boolean;
    keysCount?: number;
    hits: number;
    misses: number;
    writes: number;
    evictions: number;
    hitRate: number;
  }> {
    const stats = {
      isConnected: this.redis.isConnected(),
      keysCount: undefined as number | undefined,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      writes: this.cacheWrites,
      evictions: this.cacheEvictions,
      hitRate: this.getHitRate(),
    };

    if (stats.isConnected) {
      try {
        const keys = await this.getKeys('*');
        stats.keysCount = keys.length;
      } catch (error) {
        this.logger.error('Failed to get cache stats:', error);
      }
    }

    return stats;
  }

  /**
   * 获取或设置缓存（原子操作）
   * @param key 缓存键
   * @param getter 数据获取函数
   * @param ttl 过期时间（秒）
   * @returns 缓存的数据
   */
  async getOrSet<T>(key: string, getter: () => Promise<T>, ttl?: number): Promise<T> {
    // 先尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.cacheHits++;
      this.logger.debug(`Cache HIT: ${key}`);
      return cached;
    }

    // 缓存未命中，执行 getter
    this.cacheMisses++;
    this.logger.debug(`Cache MISS: ${key}, executing getter...`);
    
    try {
      const data = await getter();
      await this.set(key, data, ttl);
      this.cacheWrites++;
      return data;
    } catch (error) {
      this.logger.error(`Cache getOrSet error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * 批量设置缓存
   * @param entries 键值对数组
   * @param ttl 过期时间（秒）
   */
  async mset<T>(entries: Map<string, T> | Record<string, T>, ttl?: number): Promise<void> {
    try {
      const entriesArray = entries instanceof Map ? Array.from(entries.entries()) : Object.entries(entries);
      
      for (const [key, value] of entriesArray) {
        await this.set(key, value, ttl);
      }
      
      this.logger.debug(`Cache MSET: ${entriesArray.length} entries`);
    } catch (error) {
      this.logger.error('Cache MSET error:', error);
      throw error;
    }
  }

  /**
   * 按模式删除缓存（支持通配符）
   * @param pattern 键模式，如 `user:*` 或 `rec:similar:*`
   * @returns 删除的键数量
   */
  async deleteByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.getKeys(pattern);
      if (keys.length === 0) {
        this.logger.debug(`No keys found for pattern: ${pattern}`);
        return 0;
      }

      // 批量删除
      let deletedCount = 0;
      for (const key of keys) {
        await this.redis.del(key);
        deletedCount++;
      }

      this.cacheEvictions += deletedCount;
      this.logger.warn(`Cache deleted by pattern '${pattern}': ${deletedCount} keys`);
      
      return deletedCount;
    } catch (error) {
      this.logger.error(`Cache deleteByPattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * 批量删除缓存
   * @param keys 缓存键数组
   * @returns 删除的数量
   */
  async deleteBatch(keys: string[]): Promise<number> {
    try {
      let deletedCount = 0;
      for (const key of keys) {
        const exists = await this.exists(key);
        if (exists) {
          await this.delete(key);
          deletedCount++;
        }
      }
      
      this.logger.debug(`Cache batch delete: ${deletedCount}/${keys.length} keys`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Cache deleteBatch error:', error);
      return 0;
    }
  }
}
