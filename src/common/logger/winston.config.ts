import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';

// 定义日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 自定义日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台输出格式（带颜色）
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// 创建日志目录
const logDir = join(process.cwd(), 'logs');

// 日志传输配置
const transports = [
  // 控制台输出
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'debug',
    format: consoleFormat,
  }),

  // 所有日志记录到文件（按日期轮转）
  new DailyRotateFile({
    dirname: logDir,
    filename: 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'debug',
    format,
  }),

  // 错误日志单独记录
  new DailyRotateFile({
    dirname: logDir,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format,
  }),

  // HTTP 请求日志
  new DailyRotateFile({
    dirname: logDir,
    filename: 'http-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '50m',
    maxFiles: '7d',
    level: 'http',
    format,
  }),
];

// 创建 Logger 实例
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  defaultMeta: { service: 'customer-label-api' },
  transports,
});

// 开发环境下在控制台显示详细日志
if (process.env.NODE_ENV === 'development') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}
