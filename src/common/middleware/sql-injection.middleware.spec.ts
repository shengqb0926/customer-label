import { SqlInjectionMiddleware } from './sql-injection.middleware';
import { Request, Response } from 'express';

describe('SqlInjectionMiddleware', () => {
  let middleware: SqlInjectionMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    middleware = new SqlInjectionMiddleware();
    nextFunction = jest.fn();

    mockReq = {
      query: {},
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('应该被定义', () => {
    expect(middleware).toBeDefined();
  });

  it('应该有 Logger 实例', () => {
    expect((middleware as any).logger).toBeDefined();
  });

  describe('SQL 注入检测', () => {
    it('应该允许正常请求通过', () => {
      mockReq.query = { name: 'John' };
      mockReq.body = { data: 'normal data' };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('应该检测 SELECT 关键词', () => {
      mockReq.query = { search: "SELECT * FROM users" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: '检测到潜在的 SQL 注入攻击',
      }));
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('应该检测 INSERT 关键词', () => {
      mockReq.body = { data: "INSERT INTO users VALUES (1)" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('应该检测 UPDATE 关键词', () => {
      mockReq.query = { q: "UPDATE users SET name='test'" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('应该检测 DELETE 关键词', () => {
      mockReq.body = { cmd: "DELETE FROM users WHERE id=1" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('应该检测 DROP 关键词', () => {
      mockReq.query = { table: "DROP TABLE users" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('应该检测 UNION 关键词', () => {
      mockReq.query = { search: "1 UNION SELECT * FROM passwords" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('应该检测 SQL 注释符号', () => {
      mockReq.query = { id: "1; --" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('应该检测 OR 数字相等攻击', () => {
      mockReq.query = { where: "1 OR 1=1" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('应该检测 WAITFOR 延迟攻击', () => {
      mockReq.body = { delay: "WAITFOR DELAY '00:00:05'" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('应该检测 BENCHMARK 攻击', () => {
      mockReq.query = { test: "BENCHMARK(10000000, SHA1('test'))" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('查询参数检测', () => {
    it('应该检测查询参数中的 SQL 注入', () => {
      mockReq.query = { 
        username: "admin",
        password: "SELECT * FROM users"
      };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('空查询参数应该通过', () => {
      mockReq.query = {};
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('请求体检测', () => {
    it('应该检测请求体中的 SQL 注入', () => {
      mockReq.body = {
        username: "admin' --",
        action: "login"
      };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('非对象请求体不应该报错', () => {
      mockReq.body = "plain text";
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('null 请求体应该通过', () => {
      mockReq.body = null;
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('错误响应格式', () => {
    it('应该返回正确的错误状态码', () => {
      mockReq.query = { sql: "SELECT * FROM users" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('应该返回错误消息', () => {
      mockReq.query = { sql: "DROP TABLE users" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.any(String),
        statusCode: 400,
      }));
    });

    it('应该包含时间戳', () => {
      mockReq.query = { sql: "DELETE FROM users" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(String),
      }));
    });
  });

  describe('containsSqlInjection 方法', () => {
    it('应该检测大小写混合的 SQL 注入', () => {
      const containsSpy = jest.spyOn(middleware as any, 'containsSqlInjection');
      
      mockReq.query = { search: "SeLeCt * FrOm users" };
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(containsSpy).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      containsSpy.mockRestore();
    });

    it('应该检测编码的 SQL 注入', () => {
      mockReq.query = { data: "'; DROP TABLE users--" };
      
      middleware.use(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});