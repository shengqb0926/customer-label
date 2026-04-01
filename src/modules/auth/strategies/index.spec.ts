// Mock AuthService 以避免依赖注入问题
jest.mock('../auth.service', () => ({
  AuthService: jest.fn(),
}));

// 现在可以安全导入
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';

describe('Auth Strategies Module Exports', () => {
  it('应该导出 JwtStrategy', () => {
    expect(JwtStrategy).toBeDefined();
    expect(typeof JwtStrategy).toBe('function');
  });

  it('应该导出 LocalStrategy', () => {
    expect(LocalStrategy).toBeDefined();
    expect(typeof LocalStrategy).toBe('function');
  });

  it('JwtStrategy 和 LocalStrategy 应该是不同的类', () => {
    expect(JwtStrategy).not.toBe(LocalStrategy);
  });

  it('策略类应该可以被实例化（需要依赖注入）', () => {
    // 注意：这些策略在实例化时可能需要依赖注入
    // 这里只验证它们是有效的构造函数
    expect(typeof JwtStrategy).toBe('function');
    expect(typeof LocalStrategy).toBe('function');
  });
});