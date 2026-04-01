// Mock winston-daily-rotate-file for testing BEFORE any imports
jest.mock('winston-daily-rotate-file', () => {
  const { EventEmitter } = require('events');
  
  class MockDailyRotateFile extends EventEmitter {
    constructor(options?) {
      super();
      this.name = 'DailyRotateFile';
      this.level = options?.level || 'debug';
    }
    
    log(info, callback) {
      if (typeof callback === 'function') {
        callback(null, info);
      }
      this.emit('logged', info);
    }
  }
  
  return jest.fn(() => new MockDailyRotateFile());
});

import { HttpLoggerMiddleware } from './http-logger.middleware';
import { logger } from './winston.config';
import { Request, Response } from 'express';

describe('HttpLoggerMiddleware', () => {
  let middleware: HttpLoggerMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: any;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    middleware = new HttpLoggerMiddleware();
    nextFunction = jest.fn();

    mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'TestAgent/1.0',
      },
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

  it('应该调用 next() 继续处理请求', () => {
    middleware.use(mockReq as Request, mockRes as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('应该监听响应 finish 事件', () => {
    middleware.use(mockReq as Request, mockRes as Response, nextFunction);
    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('在开发环境下应该记录详细日志', (done) => {
    const debugSpy = jest.spyOn(logger, 'debug');
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockRes.statusCode = 200;
    middleware.use(mockReq as Request, mockRes as Response, nextFunction);

    setTimeout(() => {
      expect(debugSpy).toHaveBeenCalled();
      debugSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
      done();
    }, 50);
  });

  it('在生产环境下不应该记录详细日志', (done) => {
    const debugSpy = jest.spyOn(logger, 'debug');
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    mockRes.statusCode = 200;
    middleware.use(mockReq as Request, mockRes as Response, nextFunction);

    setTimeout(() => {
      expect(debugSpy).not.toHaveBeenCalled();
      debugSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
      done();
    }, 50);
  });
});