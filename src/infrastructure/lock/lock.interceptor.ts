import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DistributedLockService } from './distributed-lock.service';
import { USE_LOCK_KEY, LockMetadata } from './lock.decorator';

@Injectable()
export class LockInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly lockService: DistributedLockService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const lockMetadata = this.reflector.get<LockMetadata>(
      USE_LOCK_KEY,
      context.getHandler(),
    );

    if (!lockMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const lockValue = this.generateLockValue(request);
    const lockKey = this.resolveLockKey(lockMetadata.key, request);

    const acquired = await this.lockService.tryAcquire(lockKey, lockValue, lockMetadata.ttl);

    if (!acquired) {
      throw new BadRequestException('请求正在处理中，请稍后重试');
    }

    return next.handle().pipe(
      catchError((error) => {
        // 发生错误时释放锁
        this.lockService.release(lockKey, lockValue);
        return throwError(() => error);
      }),
    );
  }

  /**
   * 生成锁的值
   */
  private generateLockValue(request: any): string {
    return `${request.user?.id || 'anonymous'}-${Date.now()}`;
  }

  /**
   * 解析锁的键（支持参数替换）
   */
  private resolveLockKey(pattern: string, request: any): string {
    return pattern.replace(/\{(\w+)\}/g, (match, key) => {
      return request.params[key] || request.body[key] || request.query[key] || match;
    });
  }
}
