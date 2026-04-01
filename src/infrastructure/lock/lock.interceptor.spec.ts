import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { LockInterceptor } from './lock.interceptor';
import { DistributedLockService } from './distributed-lock.service';
import { of, throwError } from 'rxjs';

describe('LockInterceptor', () => {
  let interceptor: LockInterceptor;
  let reflector: Partial<Reflector>;
  let lockService: Partial<DistributedLockService>;
  let executionContext: Partial<ExecutionContext>;
  let callHandler: Partial<CallHandler>;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    };

    lockService = {
      tryAcquire: jest.fn(),
      release: jest.fn(),
    };

    callHandler = {
      handle: jest.fn(),
    };

    interceptor = new LockInterceptor(reflector as any, lockService as any);
  });

  describe('intercept', () => {
    beforeEach(() => {
      executionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn(),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };
    });

    it('没有装饰器时应该直接执行', async () => {
      (reflector.get as jest.Mock).mockReturnValue(null);
      (callHandler.handle as jest.Mock).mockReturnValue(of('result'));

      const result = await interceptor.intercept(executionContext as any, callHandler as any);
      
      expect(reflector.get).toHaveBeenCalled();
      expect(lockService.tryAcquire).not.toHaveBeenCalled();
      expect(callHandler.handle).toHaveBeenCalled();
      // 返回的是 Observable，需要订阅才能获取值
      expect(result).toBeDefined();
      expect(result.pipe).toBeDefined(); // 验证是 Observable
    });

    it('有装饰器且获取锁成功时应该执行', async () => {
      const metadata = { key: 'lock:{id}', ttl: 30000 };
      (reflector.get as jest.Mock).mockReturnValue(metadata);
      (lockService.tryAcquire as jest.Mock).mockResolvedValue(true);
      (callHandler.handle as jest.Mock).mockReturnValue(of('result'));

      const mockRequest = {
        user: { id: 'user-1' },
        params: { id: '123' },
        body: {},
        query: {},
      };
      executionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest)
      });

      await interceptor.intercept(executionContext as any, callHandler as any);
      
      expect(lockService.tryAcquire).toHaveBeenCalledWith('lock:123', expect.any(String), 30000);
      expect(callHandler.handle).toHaveBeenCalled();
    });

    it('有装饰器但获取锁失败时应该抛出异常', async () => {
      const metadata = { key: 'lock:{id}', ttl: 30000 };
      (reflector.get as jest.Mock).mockReturnValue(metadata);
      (lockService.tryAcquire as jest.Mock).mockResolvedValue(false);

      const mockRequest = {
        user: { id: 'user-1' },
        params: { id: '123' },
        body: {},
        query: {},
      };
      executionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest)
      });

      await expect(interceptor.intercept(executionContext as any, callHandler as any))
        .rejects.toThrow(BadRequestException);
      
      expect(lockService.tryAcquire).toHaveBeenCalled();
      expect(callHandler.handle).not.toHaveBeenCalled();
    });

    it('执行出错时应该释放锁', async () => {
      const metadata = { key: 'lock:{id}', ttl: 30000 };
      (reflector.get as jest.Mock).mockReturnValue(metadata);
      (lockService.tryAcquire as jest.Mock).mockResolvedValue(true);
      (lockService.release as jest.Mock).mockResolvedValue(true);
      
      // 使用 throwError 创建一个会出错的 Observable
      const error$ = throwError(() => new Error('Execution error'));
      (callHandler.handle as jest.Mock).mockReturnValue(error$);

      const mockRequest = {
        user: { id: 'user-1' },
        params: { id: '123' },
        body: {},
        query: {},
      };
      executionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest)
      });

      // 拦截器返回 Observable，需要订阅才能触发错误
      const result = await interceptor.intercept(executionContext as any, callHandler as any);
      
      // 订阅并捕获错误
      await new Promise<void>((resolve, reject) => {
        result.subscribe({
          next: () => reject(new Error('Should not emit next')),
          error: (err) => {
            expect(err.message).toBe('Execution error');
            resolve();
          }
        });
      });
      
      expect(lockService.release).toHaveBeenCalled();
    });
  });

  describe('generateLockValue', () => {
    it('应该生成包含用户 ID 和时间戳的锁值', () => {
      executionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-123' },
          }),
        }),
      };

      // @ts-ignore - 访问私有方法进行测试
      const value = interceptor.generateLockValue(executionContext.switchToHttp().getRequest());
      
      expect(value).toContain('user-123');
      expect(value).toMatch(/\d{13}/); // 时间戳格式
    });
  });

  describe('resolveLockKey', () => {
    it('应该替换单个参数', () => {
      executionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            params: { id: '123' },
            body: {},
            query: {},
          }),
        }),
      };

      // @ts-ignore - 访问私有方法进行测试
      const key = interceptor.resolveLockKey('lock:{id}', executionContext.switchToHttp().getRequest());
      
      expect(key).toBe('lock:123');
    });

    it('应该替换多个参数', () => {
      executionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            params: { userId: 'user-1', orderId: 'order-2' },
            body: {},
            query: {},
          }),
        }),
      };

      // @ts-ignore - 访问私有方法进行测试
      const key = interceptor.resolveLockKey('{userId}:{orderId}', executionContext.switchToHttp().getRequest());
      
      expect(key).toBe('user-1:order-2');
    });

    it('无法替换的参数应该保持原样', () => {
      executionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            params: {},
            body: {},
            query: {},
          }),
        }),
      };

      // @ts-ignore - 访问私有方法进行测试
      const key = interceptor.resolveLockKey('lock:{notFound}', executionContext.switchToHttp().getRequest());
      
      expect(key).toBe('lock:{notFound}');
    });
  });
});
