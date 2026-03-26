import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface LockOptions {
  /** 锁的超时时间（毫秒） */
  ttl: number;
  /** 重试间隔（毫秒） */
  retryDelay?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 自动续期 */
  autoExtend?: boolean;
}

/**
 * 分布式锁服务
 * 
 * 基于 Redis 实现分布式锁，用于防止重复推荐生成等并发场景
 * 
 * 特性：
 * - 互斥性：同一时刻只有一个客户端能持有锁
 * - 防死锁：通过 TTL 自动释放
 * - 防误删：通过唯一标识确保只能删除自己的锁
 * - 自动续期：支持看门狗机制自动续期
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly defaultTTL = 30000; // 30 秒
  private readonly defaultRetryDelay = 100; // 100ms
  private readonly defaultMaxRetries = 300; // 30 秒内重试 300 次

  constructor(private readonly redis: RedisService) {}

  /**
   * 获取锁
   * @param key 锁的键名
   * @param value 锁的值（通常是客户端唯一标识）
   * @param options 锁选项
   * @returns 是否成功获取锁
   */
  async acquire(
    key: string,
    value: string,
    options?: Partial<LockOptions>,
  ): Promise<boolean> {
    const ttl = options?.ttl || this.defaultTTL;
    const retryDelay = options?.retryDelay || this.defaultRetryDelay;
    const maxRetries = options?.maxRetries || this.defaultMaxRetries;

    let retries = 0;

    while (retries < maxRetries) {
      try {
        // 使用 SET NX EX 命令原子性地设置锁
        const result = await (this.redis as any).set(key, value, 'NX', 'PX', ttl);

        if (result === 'OK' || result === true) {
          this.logger.debug(`Acquired lock: ${key}`);
          return true;
        }

        // 锁已被其他客户端持有，等待后重试
        retries++;
        if (retries < maxRetries) {
          await this.sleep(retryDelay);
        }
      } catch (error) {
        this.logger.error(`Error acquiring lock ${key}: ${error.message}`);
        throw error;
      }
    }

    this.logger.warn(`Failed to acquire lock ${key} after ${maxRetries} retries`);
    return false;
  }

  /**
   * 尝试获取锁（非阻塞）
   * @param key 锁的键名
   * @param value 锁的值
   * @param ttl 锁的超时时间（毫秒）
   * @returns 是否成功获取锁
   */
  async tryAcquire(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      const result = await (this.redis as any).set(key, value, 'NX', 'PX', ttl || this.defaultTTL);
      return result === 'OK' || result === true;
    } catch (error) {
      this.logger.error(`Error trying to acquire lock ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * 释放锁
   * @param key 锁的键名
   * @param value 锁的值（必须是持有锁的客户端）
   * @returns 是否成功释放锁
   */
  async release(key: string, value: string): Promise<boolean> {
    try {
      // 使用 Lua 脚本确保只删除自己的锁
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await (this.redis as any).eval(script, 1, key, value);
      
      if (result === 1) {
        this.logger.debug(`Released lock: ${key}`);
        return true;
      } else {
        this.logger.warn(`Failed to release lock ${key}: lock not held by this client`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error releasing lock ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * 检查锁是否存在
   * @param key 锁的键名
   * @returns 锁是否存在
   */
  async isLocked(key: string): Promise<boolean> {
    try {
      const exists = await (this.redis as any).exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Error checking lock status ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取锁的剩余生存时间
   * @param key 锁的键名
   * @returns 剩余时间（毫秒），如果锁不存在返回 -2
   */
  async getLockTTL(key: string): Promise<number> {
    try {
      return await (this.redis as any).pttl(key);
    } catch (error) {
      this.logger.error(`Error getting lock TTL ${key}: ${error.message}`);
      return -2;
    }
  }

  /**
   * 延长锁的生存时间
   * @param key 锁的键名
   * @param value 锁的值
   * @param additionalTTL 额外延长的时间（毫秒）
   * @returns 是否成功延长
   */
  async extend(key: string, value: string, additionalTTL: number): Promise<boolean> {
    try {
      // 使用 Lua 脚本确保只延长自己的锁
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await (this.redis as any).eval(script, 1, key, value, additionalTTL);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error extending lock ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * 带看门狗的锁（自动续期）
   * @param key 锁的键名
   * @param value 锁的值
   * @param ttl 初始 TTL
   * @returns 取消看门狗的函数
   */
  async acquireWithWatchdog(
    key: string,
    value: string,
    ttl?: number,
  ): Promise<() => Promise<void>> {
    const actualTTL = ttl || this.defaultTTL;
    const acquired = await this.acquire(key, value, { ttl: actualTTL });

    if (!acquired) {
      throw new Error(`Failed to acquire lock ${key}`);
    }

    // 启动看门狗：每 1/3 TTL 时间续期一次
    const renewInterval = Math.floor(actualTTL / 3);
    let intervalId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const renew = async () => {
      if (isCancelled) return;
      
      try {
        const success = await this.extend(key, value, actualTTL);
        if (!success) {
          this.logger.warn(`Failed to renew lock ${key}, stopping watchdog`);
          cancel();
        } else {
          this.logger.debug(`Renewed lock ${key}`);
        }
      } catch (error) {
        this.logger.error(`Error renewing lock ${key}: ${error.message}`);
        cancel();
      }
    };

    const cancel = async () => {
      isCancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      // 释放锁
      await this.release(key, value);
    };

    intervalId = setInterval(renew, renewInterval);

    this.logger.debug(`Started watchdog for lock ${key} with interval ${renewInterval}ms`);

    return cancel;
  }

  /**
   * 执行加锁的业务逻辑
   * @param key 锁的键名
   * @param fn 要执行的业务逻辑函数
   * @param options 锁选项
   * @returns 业务逻辑的返回值
   */
  async executeWithLock<T>(
    key: string,
    fn: () => Promise<T>,
    options?: Partial<LockOptions> & { value?: string },
  ): Promise<T> {
    const value = options?.value || this.generateLockValue();
    
    const acquired = await this.acquire(key, value, options);
    
    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.release(key, value);
    }
  }

  /**
   * 生成唯一的锁值
   */
  private generateLockValue(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 延时函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
