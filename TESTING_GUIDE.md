# 单元测试使用指南

## 🧪 概述

本项目使用 **Jest** 作为测试框架，配合 **Supertest** 进行 HTTP 接口测试。

**技术栈**:
- ✅ [Jest](https://jestjs.io/) - 测试框架
- ✅ [ts-jest](https://kulshekhar.github.io/ts-jest/) - TypeScript 预处理器
- ✅ [@nestjs/testing](https://docs.nestjs.com/techniques/testing) - NestJS 测试工具
- ✅ [Supertest](https://github.com/visionmedia/supertest) - HTTP 测试库

---

## 📦 安装依赖

如果尚未安装测试依赖：

```bash
npm install --save-dev @types/jest ts-jest jest @types/supertest supertest
```

---

## 🔧 配置说明

### Jest 配置文件

[`jest.config.ts`](./jest.config.ts) 包含以下核心配置：

```typescript
{
  testEnvironment: 'node',           // Node.js 环境
  testRegex: '.*\\.spec\\.ts$',      // 测试文件匹配模式
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',     // TypeScript 转换
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',              // 覆盖率收集范围
  ],
  coverageThreshold: {
    global: {
      branches: 50,                  // 分支覆盖率阈值
      functions: 50,                 // 函数覆盖率阈值
      lines: 50,                     // 行覆盖率阈值
      statements: 50,                // 语句覆盖率阈值
    },
  },
}
```

### 测试文件命名规范

- Service 测试：`*.service.spec.ts`
- Controller 测试：`*.controller.spec.ts`
- Module 测试：`*.module.spec.ts`
- E2E 测试：`*.e2e-spec.ts`

---

## 🚀 运行测试

### 基础命令

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:cov

# 监视模式（自动重新运行）
npm run test:watch
```

### 高级用法

```bash
# 运行特定文件的测试
npx jest src/modules/auth/auth.service.spec.ts

# 运行匹配名称的测试用例
npx jest -t "AuthService"

# 运行匹配模式的测试
npx jest --testNamePattern="should return"

# 显示详细的测试输出
npx jest --verbose

# 运行失败的测试
npx jest --onlyFailures

# 运行上次提交后更改的测试
npx jest --changedSince=master
```

---

## 📝 测试示例

### 1. Service 层测试

**被测试服务**: [`AuthService`](./src/modules/auth/auth.service.ts)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload) => `mocked_jwt_token_${payload.sub}`),
            verify: jest.fn((token) => ({ sub: 1, username: 'testuser' })),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('should return user payload for valid credentials', async () => {
      const result = await authService.validateUser('admin', 'admin123');
      
      expect(result).toEqual({
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin', 'user'],
      });
    });

    it('should return null for invalid credentials', async () => {
      const result = await authService.validateUser('wronguser', 'wrongpass');
      
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user info', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', roles: ['user'] };
      
      const result = await authService.login(mockUser);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('expires_in', 3600);
      expect(result.token_type).toBe('Bearer');
    });
  });
});
```

**运行测试**:
```bash
npx jest auth.service.spec.ts
```

### 2. Controller 层测试

**被测试控制器**: [`AuthController`](./src/modules/auth/auth.controller.ts)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should return access token on successful login', async () => {
      const mockUser = { id: 1, username: 'testuser' };
      const mockResponse = { access_token: 'token', expires_in: 3600, token_type: 'Bearer', user: mockUser };
      
      mockAuthService.login.mockResolvedValue(mockResponse);

      const mockRequest = { user: mockUser, body: {} };
      const result = await authController.login(mockRequest as any, {});

      expect(result).toEqual(mockResponse);
    });
  });
});
```

**运行测试**:
```bash
npx jest auth.controller.spec.ts
```

### 3. 缓存服务测试

**被测试服务**: [`CacheService`](./src/infrastructure/redis/cache.service.ts)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../cache.service';
import { RedisService } from '../redis.service';

describe('CacheService', () => {
  let cacheService: CacheService;
  let redisService: RedisService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
  });

  describe('get', () => {
    it('should return value from Redis', async () => {
      const mockValue = { key: 'value' };
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockValue));

      const result = await cacheService.get('test:key');

      expect(result).toEqual(mockValue);
    });

    it('should return null if key does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent:key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in Redis with TTL', async () => {
      const mockValue = { key: 'value' };
      mockRedisService.set.mockResolvedValue('OK');

      await cacheService.set('test:key', mockValue, 3600);

      expect(redisService.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify(mockValue),
        3600
      );
    });
  });

  describe('wrap', () => {
    it('should return cached value if exists', async () => {
      const mockData = { id: 1 };
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockData));

      const callback = jest.fn();
      const result = await cacheService.wrap('key', callback, 3600);

      expect(result).toEqual(mockData);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should call callback and cache result if not in cache', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const mockData = { id: 1 };
      const callback = jest.fn().mockResolvedValue(mockData);
      
      await cacheService.wrap('key', callback, 3600);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(redisService.set).toHaveBeenCalled();
    });
  });
});
```

**运行测试**:
```bash
npx jest cache.service.spec.ts
```

---

## 📊 测试覆盖率

### 查看覆盖率报告

```bash
# 生成覆盖率报告
npm run test:cov

# 查看 HTML 报告
open coverage/index.html  # Mac/Linux
start coverage/index.html  # Windows
```

### 覆盖率报告结构

```
coverage/
├── index.html          # HTML 总览
├── lcov.info           # LCOV 格式报告
├── clover.xml          # Clover 格式报告
└── coverage-final.json # JSON 格式报告
```

### 当前测试覆盖的文件

- ✅ `src/modules/auth/auth.service.ts`
- ✅ `src/modules/auth/auth.controller.ts`
- ✅ `src/modules/scoring/scoring.service.ts`
- ✅ `src/infrastructure/redis/cache.service.ts`

### 覆盖率目标

根据 [`jest.config.ts`](./jest.config.ts) 配置：

```typescript
coverageThreshold: {
  global: {
    branches: 50,      // 分支覆盖率 ≥ 50%
    functions: 50,     // 函数覆盖率 ≥ 50%
    lines: 50,         // 行覆盖率 ≥ 50%
    statements: 50,    // 语句覆盖率 ≥ 50%
  },
}
```

---

## 🧩 测试最佳实践

### 1. Mock 外部依赖

```typescript
// ✅ 推荐：Mock Repository
const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

// ✅ 推荐：Mock Service
const mockAuthService = {
  login: jest.fn(),
  validateUser: jest.fn(),
};

// ❌ 避免：直接连接真实数据库或外部服务
```

### 2. 使用 Factory 函数创建测试数据

```typescript
// ✅ 推荐：Factory 函数
function createUser(overrides = {}) {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    roles: ['user'],
    ...overrides,
  };
}

// 使用
const adminUser = createUser({ 
  username: 'admin', 
  roles: ['admin', 'user'] 
});
```

### 3. 清晰的测试结构

```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(async () => {
    // 设置测试模块
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // 测试逻辑
    });

    it('should handle edge case', async () => {
      // 边界情况测试
    });
  });
});
```

### 4. 异步测试处理

```typescript
// ✅ 推荐：使用 async/await
it('should work with async', async () => {
  const result = await service.asyncMethod();
  expect(result).toBe(expected);
});

// ✅ 推荐：处理 Promise
it('should handle Promise rejection', async () => {
  await expect(service.failingMethod())
    .rejects
    .toThrow('Expected error');
});
```

### 5. 测试隔离

```typescript
// ✅ 推荐：每个测试前重置 Mock
beforeEach(() => {
  jest.clearAllMocks();
  // 或
  mockService.login.mockReset();
});

// ❌ 避免：测试之间共享状态
```

---

## 🔍 调试技巧

### 1. 显示详细日志

```bash
npx jest --verbose
```

### 2. 在测试中添加日志

```typescript
it('should log debug info', async () => {
  console.log('Debug:', someVariable);
  const result = await service.method();
  console.table(result);
  expect(result).toBeDefined();
});
```

### 3. 只运行特定测试

```bash
# 使用 -t 标志
npx jest -t "should return user"

# 或使用 fdescribe/fit（仅运行 marked tests）
fdescribe('Focused Suite', () => {
  fit('should run this test', () => {
    // ...
  });
});
```

### 4. 跳过测试

```typescript
// 跳过整个 describe 块
xdescribe('Skipped Suite', () => {
  it('will not run', () => {
    // ...
  });
});

// 跳过单个测试
xit('will not run', () => {
  // ...
});
```

---

## 🐛 常见问题

### 问题 1: 测试超时

**错误**: `Error: Timeout - Async callback was not invoked within the specified time`

**解决方案**:
```typescript
// 增加超时时间
jest.setTimeout(30000);

// 或在 jest.config.ts 中
{
  testTimeout: 30000,
}
```

### 问题 2: Mock 不生效

**原因**: Mock 对象未正确注入

**解决方案**:
```typescript
// ✅ 确保在 beforeEach 中创建 Mock
beforeEach(async () => {
  const module = await Test.createTestingModule({
    providers: [
      Service,
      { provide: Dependency, useValue: mockDependency },
    ],
  }).compile();
  
  service = module.get<Service>(Service);
});
```

### 问题 3: 覆盖率不达标

**解决方案**:
```bash
# 临时降低覆盖率要求
npm test -- --coverageThreshold='{}'

# 或针对特定文件排除
// jest.config.ts
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.module.ts',  // 排除模块文件
  '!src/**/*.entity.ts',  // 排除实体类
]
```

### 问题 4: TypeScript 编译错误

**错误**: `SyntaxError: Unexpected token import`

**解决方案**:
确保 `tsconfig.json` 和 `jest.config.ts` 配置一致：
```typescript
// jest.config.ts
globals: {
  'ts-jest': {
    tsconfig: {
      target: 'ES2021',
      module: 'commonjs',
    },
  },
},
```

---

## 📚 相关资源

- [NestJS 测试官方文档](https://docs.nestjs.com/techniques/testing)
- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [Jest Cheat Sheet](https://github.com/sapegin/jest-cheat-sheet)

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26
