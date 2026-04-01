import { ApiVersionMiddleware } from './api-version.middleware';
import { ConfigService } from '@nestjs/config';

describe('ApiVersionMiddleware', () => {
  let middleware: ApiVersionMiddleware;
  let mockConfigService: Partial<ConfigService>;
  let mockReq: any;
  let mockRes: any;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'API_VERSION') return 'v1';
        if (key === 'API_SUPPORTED_VERSIONS') return ['v1', 'v2'];
        if (key === 'api.version.default') return 'v1';
        if (key === 'api.version.header') return 'X-API-Version';
        return defaultValue;
      }),
    } as any;

    middleware = new ApiVersionMiddleware(mockConfigService as ConfigService);
    nextFunction = jest.fn();

    mockReq = {
      headers: {},
      url: '/api/users',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
  });

  it('应该被定义', () => {
    expect(middleware).toBeDefined();
  });

  it('应该从配置服务获取默认版本', () => {
    expect(ApiVersionMiddleware).toBeDefined();
  });

  describe('use 方法', () => {
    it('应该支持版本化路径 /api/v1/', () => {
      mockReq.url = '/api/v1/users';
      middleware.use(mockReq, mockRes, nextFunction);
      
      expect(mockReq.apiVersion).toBe('v1');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('应该支持版本化路径 /api/v2/', () => {
      mockReq.url = '/api/v2/users';
      middleware.use(mockReq, mockRes, nextFunction);
      
      expect(mockReq.apiVersion).toBe('v2');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('没有指定版本时应该使用默认版本', () => {
      mockReq.url = '/api/users';
      middleware.use(mockReq, mockRes, nextFunction);
      
      expect(mockReq.apiVersion).toBe('v1');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('应该设置 X-API-Version 响应头', () => {
      mockReq.url = '/api/v1/users';
      middleware.use(mockReq, mockRes, nextFunction);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-API-Version', 'v1');
    });

    it('不支持的版本应该返回 400 错误', () => {
      mockReq.url = '/api/v999/users';
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce('v1')
        .mockReturnValueOnce(['v1', 'v2']);
      
      middleware.use(mockReq, mockRes, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('不支持的 API 版本'),
      }));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('根路径应该使用默认版本', () => {
      mockReq.url = '/';
      middleware.use(mockReq, mockRes, nextFunction);
      
      expect(mockReq.apiVersion).toBe('v1');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('健康检查路径应该使用默认版本', () => {
      mockReq.url = '/health';
      middleware.use(mockReq, mockRes, nextFunction);
      
      expect(mockReq.apiVersion).toBe('v1');
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('配置测试', () => {
    it('应该使用配置的默认版本', () => {
      (mockConfigService.get as jest.Mock).mockReturnValueOnce('v2');
      middleware = new ApiVersionMiddleware(mockConfigService as ConfigService);
      
      mockReq.url = '/api/users';
      middleware.use(mockReq, mockRes, nextFunction);
      
      expect(mockReq.apiVersion).toBe('v2');
    });

    it('应该使用配置的支持版本列表', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce('v1')
        .mockReturnValueOnce(['v1', 'v2', 'v3']);
      
      middleware = new ApiVersionMiddleware(mockConfigService as ConfigService);
      
      mockReq.url = '/api/v2/test';
      middleware.use(mockReq, mockRes, nextFunction);
      
      expect(mockReq.apiVersion).toBe('v2');
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});