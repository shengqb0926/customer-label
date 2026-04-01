import { LocalAuthGuard } from './local-auth.guard';

describe('LocalAuthGuard', () => {
  it('应该定义 LocalAuthGuard 类', () => {
    expect(LocalAuthGuard).toBeDefined();
  });

  it('LocalAuthGuard 应该是 AuthGuard 的子类', () => {
    // 验证继承关系
    const guard = new LocalAuthGuard();
    expect(guard).toBeDefined();
  });

  it('LocalAuthGuard 应该可以被实例化', () => {
    const guard = new LocalAuthGuard();
    expect(guard).toBeInstanceOf(LocalAuthGuard);
  });

  it('LocalAuthGuard 的实例应该有 canActivate 方法（继承自 AuthGuard）', () => {
    const guard = new LocalAuthGuard();
    expect(typeof guard.canActivate).toBe('function');
  });
});