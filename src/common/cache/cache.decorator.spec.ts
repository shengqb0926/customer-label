import { Reflector } from '@nestjs/core';
import {
  Cacheable,
  CacheEvict,
  CachePut,
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHEABLE_METADATA,
  CACHE_EVICT_METADATA,
  CACHE_PUT_METADATA,
} from './cache.decorator';

describe('Cache Decorators', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('Cacheable', () => {
    it('should set cacheable metadata to true', () => {
      class TestService {
        @Cacheable({ key: (id: number) => `test:${id}`, ttl: 3600 })
        getData(id: number) {
          return { id };
        }
      }

      const service = new TestService();
      
      expect(reflector.get(CACHEABLE_METADATA, service.getData)).toBe(true);
      expect(reflector.get(CACHE_KEY_METADATA, service.getData)).toBeDefined();
      expect(reflector.get(CACHE_TTL_METADATA, service.getData)).toBe(3600);
    });

    it('should set key generator function', () => {
      class TestService {
        @Cacheable({ key: (id: number) => `test:${id}`, ttl: 3600 })
        getData(id: number) {
          return { id };
        }
      }

      const service = new TestService();
      const keyGenerator = reflector.get<(id: number) => string>(CACHE_KEY_METADATA, service.getData);
      
      expect(keyGenerator).toBeDefined();
      expect(keyGenerator(123)).toBe('test:123');
    });

    it('should set TTL metadata', () => {
      class TestService {
        @Cacheable({ key: (id: number) => `test:${id}`, ttl: 7200 })
        getData(id: number) {
          return { id };
        }
      }

      const service = new TestService();
      const ttl = reflector.get<number>(CACHE_TTL_METADATA, service.getData);
      
      expect(ttl).toBe(7200);
    });

    it('should use default TTL when not provided', () => {
      class TestService {
        @Cacheable({ key: (id: number) => `test:${id}` })
        getData(id: number) {
          return { id };
        }
      }

      const service = new TestService();
      const ttl = reflector.get<number>(CACHE_TTL_METADATA, service.getData);
      
      expect(ttl).toBe(3600); // Default value
    });

    it('should work with different key patterns', () => {
      class TestService {
        @Cacheable({ 
          key: (userId: number, itemId: string) => `user:${userId}:item:${itemId}`, 
          ttl: 1800 
        })
        getItem(userId: number, itemId: string) {
          return { userId, itemId };
        }
      }

      const service = new TestService();
      const keyGenerator = reflector.get<Function>(CACHE_KEY_METADATA, service.getItem);
      
      expect(keyGenerator(1, 'abc')).toBe('user:1:item:abc');
    });
  });

  describe('CacheEvict', () => {
    it('should set evict metadata with key', () => {
      class TestService {
        @CacheEvict({ key: (id: number) => `test:${id}` })
        deleteData(id: number) {
          return true;
        }
      }

      const service = new TestService();
      const evictOptions = reflector.get<{ key: (id: number) => string }>(CACHE_EVICT_METADATA, service.deleteData);
      
      expect(evictOptions).toBeDefined();
      expect(evictOptions.key).toBeDefined();
      expect(evictOptions.key(456)).toBe('test:456');
    });

    it('should support pattern option', () => {
      class TestService {
        @CacheEvict({ key: (id: number) => `test:${id}`, pattern: 'all' })
        deleteData(id: number) {
          return true;
        }
      }

      const service = new TestService();
      const evictOptions = reflector.get<{ key: (id: number) => string; pattern?: string }>(CACHE_EVICT_METADATA, service.deleteData);
      
      expect(evictOptions.pattern).toBe('all');
    });

    it('should work without pattern option', () => {
      class TestService {
        @CacheEvict({ key: (id: number) => `test:${id}` })
        deleteData(id: number) {
          return true;
        }
      }

      const service = new TestService();
      const evictOptions = reflector.get<{ key: (id: number) => string; pattern?: string }>(CACHE_EVICT_METADATA, service.deleteData);
      
      expect(evictOptions.pattern).toBeFalsy();
    });
  });

  describe('CachePut', () => {
    it('should set put metadata with options', () => {
      class TestService {
        @CachePut({ key: (data: { id: number }) => `test:${data.id}`, ttl: 5400 })
        updateData(data: { id: number }) {
          return data;
        }
      }

      const service = new TestService();
      const putOptions = reflector.get<{ key: (data: { id: number }) => string; ttl: number }>(CACHE_PUT_METADATA, service.updateData);
      
      expect(putOptions).toBeDefined();
      expect(putOptions.key).toBeDefined();
      expect(putOptions.key({ id: 789 })).toBe('test:789');
      expect(putOptions.ttl).toBe(5400);
    });

    it('should work with complex object keys', () => {
      class TestService {
        @CachePut({ 
          key: (user: { id: number; email: string }) => `user:${user.id}:${user.email}`,
          ttl: 3600 
        })
        updateUser(user: { id: number; email: string }) {
          return user;
        }
      }

      const service = new TestService();
      const putOptions = reflector.get<{ key: Function; ttl: number }>(CACHE_PUT_METADATA, service.updateUser);
      
      expect(putOptions).toBeDefined();
      expect(typeof putOptions.key).toBe('function');
      expect(putOptions.key({ id: 1, email: 'test@example.com' }))
        .toBe('user:1:test@example.com');
      expect(putOptions.ttl).toBe(3600);
    });

    it('should preserve all options', () => {
      class TestService {
        @CachePut({ key: (id: number) => `test:${id}`, ttl: 9000 })
        updateData(id: number) {
          return { id };
        }
      }

      const service = new TestService();
      const putOptions = reflector.get<{ ttl: number }>(CACHE_PUT_METADATA, service.updateData);
      
      expect(putOptions.ttl).toBe(9000);
    });
  });

  describe('Multiple Decorators on Same Method', () => {
    it('should handle multiple cache decorators', () => {
      class TestService {
        @Cacheable({ key: (id: number) => `cache:${id}`, ttl: 3600 })
        @CachePut({ key: (id: number) => `update:${id}`, ttl: 1800 })
        process(id: number) {
          return { id };
        }
      }

      const service = new TestService();
      
      // Both decorators should set their metadata independently
      expect(reflector.get(CACHEABLE_METADATA, service.process)).toBe(true);
      expect(reflector.get(CACHE_PUT_METADATA, service.process)).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined in key generator', () => {
      class TestService {
        @Cacheable({ key: (value: any) => `test:${value}`, ttl: 3600 })
        getData(value: any) {
          return { value };
        }
      }

      const service = new TestService();
      const keyGenerator = reflector.get<Function>(CACHE_KEY_METADATA, service.getData);
      
      expect(keyGenerator(null)).toBe('test:null');
      expect(keyGenerator(undefined)).toBe('test:undefined');
    });

    it('should handle special characters in generated keys', () => {
      class TestService {
        @Cacheable({ key: (email: string) => `user:${email}`, ttl: 3600 })
        getUser(email: string) {
          return { email };
        }
      }

      const service = new TestService();
      const keyGenerator = reflector.get<Function>(CACHE_KEY_METADATA, service.getUser);
      
      expect(keyGenerator('test@example.com')).toBe('user:test@example.com');
    });

    it('should handle large TTL values', () => {
      class TestService {
        @Cacheable({ key: (id: number) => `test:${id}`, ttl: 86400 * 365 }) // 1 year
        getData(id: number) {
          return { id };
        }
      }

      const service = new TestService();
      const ttl = reflector.get<number>(CACHE_TTL_METADATA, service.getData);
      
      expect(ttl).toBe(31536000);
    });
  });
});
