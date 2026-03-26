import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // 测试环境
  testEnvironment: 'node',
  
  // 文件扩展名
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // 根目录
  rootDir: '.',
  
  // 测试文件匹配模式
  testRegex: '.*\\.spec\\.ts$',
  
  // 转换配置
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  
  // 收集覆盖率
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/entities.ts',
    '!src/data-source.ts',
  ],
  
  // 覆盖率报告
  coverageDirectory: './coverage',
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  
  // 模块路径映射
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  
  // 测试超时时间
  testTimeout: 30000,
  
  // 详细输出
  verbose: true,
  
  // 显示颜色
  colors: true,
  
  // 设置测试前的全局变量
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'ES2021',
        module: 'commonjs',
        lib: ['es2021'],
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        allowSyntheticDefaultImports: true,
        strictPropertyInitialization: false,
      },
    },
  },
};

export default config;
