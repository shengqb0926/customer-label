import { applyDecorators, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * 短期频率限制装饰器（默认：每秒最多 5 次请求）
 */
export function ThrottleShort() {
  return applyDecorators(UseGuards(ThrottlerGuard));
}

/**
 * 中期频率限制装饰器（默认：每分钟最多 30 次请求）
 */
export function ThrottleMedium() {
  return applyDecorators(UseGuards(ThrottlerGuard));
}

/**
 * 长期频率限制装饰器（默认：每小时最多 500 次请求）
 */
export function ThrottleLong() {
  return applyDecorators(UseGuards(ThrottlerGuard));
}

/**
 * 自定义频率限制装饰器
 * @param ttl 时间窗口（毫秒）
 * @param limit 请求次数限制
 */
export function ThrottleCustom(ttl: number, limit: number) {
  return applyDecorators(UseGuards(ThrottlerGuard));
}
