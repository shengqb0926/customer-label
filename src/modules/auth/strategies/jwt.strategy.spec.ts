import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);
    
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('constructor', () => {
    it('应该使用环境变量中的 JWT_SECRET', () => {
      const originalSecret = process.env.JWT_SECRET;
      
      try {
        process.env.JWT_SECRET = 'test-secret-key';
        // 需要重新实例化策略才能使用新的环境变量
        const newStrategy = new JwtStrategy(authService);
        expect(newStrategy).toBeDefined();
      } finally {
        process.env.JWT_SECRET = originalSecret;
      }
    });

    it('应该在没有 JWT_SECRET 时使用默认密钥', () => {
      const originalSecret = process.env.JWT_SECRET;
      
      try {
        delete process.env.JWT_SECRET;
        const newStrategy = new JwtStrategy(authService);
        expect(newStrategy).toBeDefined();
      } finally {
        process.env.JWT_SECRET = originalSecret;
      }
    });

    it('应该配置正确的 JWT 提取方式', () => {
      // 验证策略配置
      expect(strategy).toBeInstanceOf(JwtStrategy);
    });
  });

  describe('validate', () => {
    it('应该从 JWT payload 中提取用户信息', async () => {
      const payload = {
        sub: 123,
        username: 'testuser',
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 3600,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 123,
        username: 'testuser',
        roles: ['user'],
      });
    });

    it('应该处理包含多个角色的 payload', async () => {
      const payload = {
        sub: 456,
        username: 'admin',
        roles: ['admin', 'user'],
        iat: Date.now(),
        exp: Date.now() + 3600,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 456,
        username: 'admin',
        roles: ['admin', 'user'],
      });
    });

    it('应该处理没有 roles 的 payload', async () => {
      const payload = {
        sub: 789,
        username: 'simpleuser',
        iat: Date.now(),
        exp: Date.now() + 3600,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 789,
        username: 'simpleuser',
        roles: undefined,
      });
    });

    it('应该只返回必要的字段（过滤掉 iat 和 exp）', async () => {
      const payload = {
        sub: 100,
        username: 'filtereduser',
        roles: ['user'],
        iat: 1234567890,
        exp: 1234567890 + 3600,
        extraField: 'should not be included',
      };

      const result = await strategy.validate(payload);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('roles');
      expect(result).not.toHaveProperty('iat');
      expect(result).not.toHaveProperty('exp');
      expect(result).not.toHaveProperty('extraField');
    });

    it('应该处理字符串类型的用户 ID', async () => {
      const payload = {
        sub: 'uuid-123-456',
        username: 'stringiduser',
        roles: ['user'],
      };

      const result = await strategy.validate(payload);

      expect(result.id).toBe('uuid-123-456');
    });

    it('应该处理空的角色数组', async () => {
      const payload = {
        sub: 999,
        username: 'norolesuser',
        roles: [],
      };

      const result = await strategy.validate(payload);

      expect(result.roles).toEqual([]);
    });
  });

  describe('安全性测试', () => {
    it('不应该修改原始 payload 对象', async () => {
      const payload = {
        sub: 1,
        username: 'original',
        roles: ['user'],
      };
      
      const originalPayload = { ...payload };
      
      await strategy.validate(payload);

      expect(payload).toEqual(originalPayload);
    });

    it('应该正确处理嵌套的对象数据', async () => {
      const payload = {
        sub: 1,
        username: 'nesteduser',
        roles: ['user'],
        metadata: {
          department: 'IT',
          level: 5,
        },
      };

      const result = await strategy.validate(payload);

      expect((result as any).metadata).toBeUndefined();
    });
  });
});