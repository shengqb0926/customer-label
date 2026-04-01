import { PrometheusMiddleware } from './prometheus.middleware';
import { Request, Response } from 'express';
import * as promClient from 'prom-client';

describe('PrometheusMiddleware', () => {
  let middleware: PrometheusMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: any;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    middleware = new PrometheusMiddleware();
    nextFunction = jest.fn();

    mockReq = {
      method: 'GET',
      originalUrl: '/api/users/123',
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

  afterEach(() => {
    promClient.register.clear();
  });

  it('应该被定义', () => {
    expect(middleware).toBeDefined();
  });

  it('应该调用 next() 继续处理请求', () => {
    middleware.use(mockReq as Request, mockRes as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('应该监听响应 finish 事件', () => {
    middleware.use(mockReq as Request, mockRes as Response, nextFunction);
    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('应该清理路径参数', () => {
    const result = (middleware as any).sanitizePath('/api/users/123');
    expect(result).toBe('/api/users/:id');
  });

  it('应该替换多个数字 ID', () => {
    const result = (middleware as any).sanitizePath('/api/users/123/posts/456');
    expect(result).toBe('/api/users/:id/posts/:id');
  });
});