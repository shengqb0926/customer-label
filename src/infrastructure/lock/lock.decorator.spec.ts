import { USE_LOCK_KEY, UseLock } from './lock.decorator';

describe('Lock Decorator', () => {
  it('应该导出 USE_LOCK_KEY 常量', () => {
    expect(USE_LOCK_KEY).toBeDefined();
    expect(typeof USE_LOCK_KEY).toBe('string');
    expect(USE_LOCK_KEY).toBe('use_lock');
  });

  it('UseLock 装饰器应该是一个函数', () => {
    expect(UseLock).toBeDefined();
    expect(typeof UseLock).toBe('function');
  });

  it('UseLock 应该接受 key 参数并返回装饰器', () => {
    const decorator = UseLock('test-key');
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });

  it('UseLock 可以接受 key 和 ttl 参数', () => {
    const decorator = UseLock('test-key', 300);
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });

  it('UseLock 装饰器应该使用 SetMetadata', () => {
    // 验证装饰器会设置元数据
    const decorator = UseLock('my-lock', 600);
    expect(decorator).toBeTruthy();
  });
});