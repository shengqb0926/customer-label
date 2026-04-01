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

import { logger } from './winston.config';
import * as winston from 'winston';
import { join } from 'path';

describe('Winston Logger Configuration', () => {
  it('应该导出 logger 对象', () => {
    expect(logger).toBeDefined();
  });

  it('logger 应该有 error 方法', () => {
    expect(logger.error).toBeDefined();
    expect(typeof logger.error).toBe('function');
  });

  it('logger 应该有 warn 方法', () => {
    expect(logger.warn).toBeDefined();
    expect(typeof logger.warn).toBe('function');
  });

  it('logger 应该有 info 方法', () => {
    expect(logger.info).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('logger 应该有 http 方法', () => {
    expect(logger.http).toBeDefined();
    expect(typeof logger.http).toBe('function');
  });

  it('logger 应该有 debug 方法', () => {
    expect(logger.debug).toBeDefined();
    expect(typeof logger.debug).toBe('function');
  });

  it('logger.debug 应该可以调用', () => {
    expect(() => logger.debug('Test debug message')).not.toThrow();
  });
});