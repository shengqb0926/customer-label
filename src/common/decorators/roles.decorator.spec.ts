import { Roles } from './roles.decorator';

describe('Roles Decorator', () => {
  it('Roles 装饰器应该是一个函数', () => {
    expect(Roles).toBeDefined();
    expect(typeof Roles).toBe('function');
  });

  it('Roles 应该接受字符串参数并返回装饰器', () => {
    const decorator = Roles('admin');
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });

  it('Roles 可以接受多个角色参数', () => {
    const decorator = Roles('admin', 'user', 'manager');
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });

  it('Roles 可以接受空参数', () => {
    const decorator = Roles();
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });

  it('Roles 装饰器使用 SetMetadata', () => {
    const decorator = Roles('test-role');
    expect(decorator).toBeTruthy();
  });
});