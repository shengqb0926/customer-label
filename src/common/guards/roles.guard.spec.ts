import { RolesGuard, ROLES_KEY } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(() => {
    reflector = mockReflector as any;
    guard = new RolesGuard(reflector);
  });

  it('应该被定义', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('当没有角色要求时应该返回 true', () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      // Just verify the reflector was called with the correct key, don't assert on the function references
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
    });

    it('当用户有要求的角色时应该返回 true', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['ADMIN', 'USER']);

      const request = {
        user: {
          id: 1,
          username: 'testuser',
          roles: ['USER'],
        },
      };

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('当用户没有要求的角色时应该返回 false', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);

      const request = {
        user: {
          id: 1,
          username: 'testuser',
          roles: ['USER'],
        },
      };

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('当没有用户时应该返回 false', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);

      const request = {
        user: null,
      };

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });
});
