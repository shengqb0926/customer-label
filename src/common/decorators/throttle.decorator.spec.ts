import { ThrottleShort, ThrottleMedium, ThrottleLong, ThrottleCustom } from './throttle.decorator';

describe('Throttle Decorators', () => {
  describe('ThrottleShort', () => {
    it('应该返回装饰器函数', () => {
      const decorator = ThrottleShort();
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('应该是一个有效的装饰器', () => {
      // 验证装饰器可以正常调用而不抛出错误
      expect(() => ThrottleShort()).not.toThrow();
    });
  });

  describe('ThrottleMedium', () => {
    it('应该返回装饰器函数', () => {
      const decorator = ThrottleMedium();
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('应该是一个有效的装饰器', () => {
      expect(() => ThrottleMedium()).not.toThrow();
    });
  });

  describe('ThrottleLong', () => {
    it('应该返回装饰器函数', () => {
      const decorator = ThrottleLong();
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('应该是一个有效的装饰器', () => {
      expect(() => ThrottleLong()).not.toThrow();
    });
  });

  describe('ThrottleCustom', () => {
    it('应该接受 ttl 和 limit 参数并返回装饰器', () => {
      const ttl = 60000; // 1 分钟
      const limit = 10;
      
      const decorator = ThrottleCustom(ttl, limit);
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('应该使用正确的参数创建装饰器', () => {
      expect(() => ThrottleCustom(60000, 100)).not.toThrow();
    });

    it('应该处理不同的 ttl 和 limit 值', () => {
      const testCases = [
        { ttl: 1000, limit: 5 },      // 1 秒 5 次
        { ttl: 60000, limit: 30 },    // 1 分钟 30 次
        { ttl: 3600000, limit: 500 }, // 1 小时 500 次
        { ttl: 100, limit: 1 },       // 100ms 1 次（极端情况）
      ];

      testCases.forEach(({ ttl, limit }) => {
        expect(() => ThrottleCustom(ttl, limit)).not.toThrow();
      });
    });
  });

  describe('装饰器组合', () => {
    it('所有装饰器都应该正确导出', () => {
      expect(ThrottleShort).toBeDefined();
      expect(ThrottleMedium).toBeDefined();
      expect(ThrottleLong).toBeDefined();
      expect(ThrottleCustom).toBeDefined();
    });

    it('装饰器应该是独立的', () => {
      const short = ThrottleShort();
      const medium = ThrottleMedium();
      const long = ThrottleLong();
      const custom = ThrottleCustom(1000, 5);

      expect(short).not.toBe(medium);
      expect(medium).not.toBe(long);
      expect(long).not.toBe(custom);
    });

    it('装饰器应该都是函数', () => {
      expect(typeof ThrottleShort()).toBe('function');
      expect(typeof ThrottleMedium()).toBe('function');
      expect(typeof ThrottleLong()).toBe('function');
      expect(typeof ThrottleCustom(1000, 5)).toBe('function');
    });
  });
});