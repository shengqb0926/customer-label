import { PerformanceMiddleware } from './performance.middleware';
import { Request, Response } from 'express';

describe('PerformanceMiddleware', () => {
  let middleware: PerformanceMiddleware;
  let mockReq: any;
  let mockRes: any;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    middleware = new PerformanceMiddleware();
    nextFunction = jest.fn();

    mockReq = {
      method: 'GET',
      path: '/api/users',
    };

    mockRes = {
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          setTimeout(callback, 10);
        }
      }),
      statusCode: 200,
    };
  });

  it('应该被定义', () => {
    expect(middleware).toBeDefined();
  });

  it('应该有 Logger 实例', () => {
    expect((middleware as any).logger).toBeDefined();
  });

  it('应该初始化性能指标', () => {
    const metrics = middleware.getMetrics();
    expect(metrics.totalRequests).toBe(0);
    expect(metrics.avgResponseTime).toBe(0);
    expect(metrics.slowRequests).toBe(0);
  });

  describe('use 方法', () => {
    it('应该调用 next() 继续处理请求', () => {
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('应该监听响应 finish 事件', () => {
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('应该记录请求总数', (done) => {
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);

      setTimeout(() => {
        const metrics = middleware.getMetrics();
        expect(metrics.totalRequests).toBe(1);
        done();
      }, 50);
    });

    it('应该计算平均响应时间', (done) => {
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);

      setTimeout(() => {
        const metrics = middleware.getMetrics();
        expect(metrics.avgResponseTime).toBeGreaterThan(0);
        done();
      }, 50);
    });
  });

  describe('getMetrics', () => {
    it('应该返回性能指标副本', () => {
      const metrics = middleware.getMetrics();
      expect(metrics).toEqual({
        totalRequests: 0,
        avgResponseTime: 0,
        slowRequests: 0,
        responseTimeByEndpoint: expect.any(Map),
      });
    });
  });

  describe('getAvgResponseTime', () => {
    it('不存在的端点应该返回 0', () => {
      const avgTime = middleware.getAvgResponseTime('GET /nonexistent');
      expect(avgTime).toBe(0);
    });
  });
});