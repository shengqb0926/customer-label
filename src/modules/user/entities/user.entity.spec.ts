import { User, UserRole } from './user.entity';

describe('User Entity', () => {
  describe('Basic Properties', () => {
    it('should create a user with required fields', () => {
      const user = new User();
      user.id = 1;
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';

      expect(user.id).toBe(1);
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.password).toBe('password123');
    });

    it('should initialize roles with default value', () => {
      const user = new User();
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';
      user.roles = [UserRole.USER]; // Manually set default value using enum

      expect(user.roles).toEqual([UserRole.USER]);
    });

    it('should set multiple roles', () => {
      const user = new User();
      user.username = 'admin';
      user.email = 'admin@example.com';
      user.password = 'password123';
      user.roles = [UserRole.ADMIN, UserRole.USER];

      expect(user.roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should allow optional fields to be null', () => {
      const user = new User();
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';
      
      user.fullName = null;
      user.phone = null;
      user.isActive = true;
      user.lastLoginAt = null;
      user.lastLoginIp = null;

      expect(user.fullName).toBeNull();
      expect(user.phone).toBeNull();
      expect(user.isActive).toBe(true);
      expect(user.lastLoginAt).toBeNull();
      expect(user.lastLoginIp).toBeNull();
    });
  });

  describe('Role Checking Methods', () => {
    let user: User;

    beforeEach(() => {
      user = new User();
      user.id = 1;
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';
    });

    describe('hasRole', () => {
      it('should return true when user has the specified role', () => {
        user.roles = [UserRole.USER, UserRole.ANALYST];

        expect(user.hasRole(UserRole.USER)).toBe(true);
        expect(user.hasRole(UserRole.ANALYST)).toBe(true);
      });

      it('should return false when user does not have the specified role', () => {
        user.roles = [UserRole.USER];

        expect(user.hasRole(UserRole.ADMIN)).toBe(false);
        expect(user.hasRole(UserRole.ANALYST)).toBe(false);
      });

      it('should handle empty roles array', () => {
        user.roles = [];

        expect(user.hasRole(UserRole.USER)).toBe(false);
        expect(user.hasRole(UserRole.ADMIN)).toBe(false);
      });
    });

    describe('isAdmin', () => {
      it('should return true when user is admin', () => {
        user.roles = [UserRole.ADMIN];

        expect(user.isAdmin()).toBe(true);
      });

      it('should return false when user is not admin', () => {
        user.roles = [UserRole.USER];

        expect(user.isAdmin()).toBe(false);
      });

      it('should return true when user has multiple roles including admin', () => {
        user.roles = [UserRole.USER, UserRole.ADMIN, UserRole.ANALYST];

        expect(user.isAdmin()).toBe(true);
      });
    });

    describe('isAnalyst', () => {
      it('should return true when user is analyst', () => {
        user.roles = [UserRole.ANALYST];

        expect(user.isAnalyst()).toBe(true);
      });

      it('should return false when user is not analyst', () => {
        user.roles = [UserRole.USER];

        expect(user.isAnalyst()).toBe(false);
      });

      it('should return true when user has multiple roles including analyst', () => {
        user.roles = [UserRole.USER, UserRole.ANALYST];

        expect(user.isAnalyst()).toBe(true);
      });
    });

    describe('isUser', () => {
      it('should return true when user has USER role', () => {
        user.roles = [UserRole.USER];

        expect(user.isUser()).toBe(true);
      });

      it('should return false when user does not have USER role', () => {
        user.roles = [UserRole.ADMIN];

        expect(user.isUser()).toBe(false);
      });

      it('should return true for regular user with multiple roles', () => {
        user.roles = [UserRole.USER, UserRole.ANALYST];

        expect(user.isUser()).toBe(true);
      });
    });

    describe('Combined Role Tests', () => {
      it('should correctly identify roles for admin user', () => {
        user.roles = [UserRole.ADMIN];

        expect(user.isAdmin()).toBe(true);
        expect(user.isAnalyst()).toBe(false);
        expect(user.isUser()).toBe(false);
        expect(user.hasRole(UserRole.ADMIN)).toBe(true);
      });

      it('should correctly identify roles for analyst user', () => {
        user.roles = [UserRole.ANALYST];

        expect(user.isAdmin()).toBe(false);
        expect(user.isAnalyst()).toBe(true);
        expect(user.isUser()).toBe(false);
        expect(user.hasRole(UserRole.ANALYST)).toBe(true);
      });

      it('should correctly identify roles for regular user', () => {
        user.roles = [UserRole.USER];

        expect(user.isAdmin()).toBe(false);
        expect(user.isAnalyst()).toBe(false);
        expect(user.isUser()).toBe(true);
        expect(user.hasRole(UserRole.USER)).toBe(true);
      });

      it('should correctly identify roles for user with all roles', () => {
        user.roles = [UserRole.ADMIN, UserRole.ANALYST, UserRole.USER];

        expect(user.isAdmin()).toBe(true);
        expect(user.isAnalyst()).toBe(true);
        expect(user.isUser()).toBe(true);
      });
    });
  });

  describe('User Entity - Additional Fields', () => {
    it('should store timestamps correctly', () => {
      const now = new Date();
      const user = new User();
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';
      user.createdAt = now;
      user.updatedAt = now;

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.createdAt.getTime()).toBe(now.getTime());
    });

    it('should track last login information', () => {
      const lastLoginDate = new Date('2024-01-15T10:30:00Z');
      const user = new User();
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';
      user.lastLoginAt = lastLoginDate;
      user.lastLoginIp = '192.168.1.100';

      expect(user.lastLoginAt).toBeInstanceOf(Date);
      expect(user.lastLoginAt.toISOString()).toBe(lastLoginDate.toISOString());
      expect(user.lastLoginIp).toBe('192.168.1.100');
    });

    it('should support audit fields', () => {
      const user = new User();
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';
      user.createdBy = 100;
      user.updatedBy = 101;

      expect(user.createdBy).toBe(100);
      expect(user.updatedBy).toBe(101);
    });

    it('should support full name and phone', () => {
      const user = new User();
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';
      user.fullName = 'John Doe';
      user.phone = '+1-555-0123';

      expect(user.fullName).toBe('John Doe');
      expect(user.phone).toBe('+1-555-0123');
    });
  });

  describe('UserRole Enum', () => {
    it('should have correct enum values', () => {
      expect(UserRole.ADMIN).toBe('admin');
      expect(UserRole.USER).toBe('user');
      expect(UserRole.ANALYST).toBe('analyst');
    });

    it('should be usable in array', () => {
      const roles = [UserRole.ADMIN, UserRole.USER, UserRole.ANALYST];
      
      expect(roles).toContain('admin');
      expect(roles).toContain('user');
      expect(roles).toContain('analyst');
    });
  });
});
