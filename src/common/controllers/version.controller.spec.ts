import { Test, TestingModule } from '@nestjs/testing';
import { VersionController } from './version.controller';

describe('VersionController', () => {
  let controller: VersionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersionController],
    }).compile();

    controller = module.get<VersionController>(VersionController);
  });

  it('应该被定义', () => {
    expect(controller).toBeDefined();
  });

  describe('getVersion', () => {
    it('应该返回版本信息', () => {
      const result = controller.getVersion();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('timestamp');
      
      expect(result.version).toBe('1.0.0');
      expect(result.name).toBe('客户标签智能推荐系统 API');
      expect(result.description).toBe('Customer Label Intelligent Recommendation System');
      expect(typeof result.timestamp).toBe('string');
      expect(Date.parse(result.timestamp)).not.toBeNaN(); // 验证是有效的 ISO 日期
    });
  });

  describe('healthCheck', () => {
    it('应该返回健康状态', () => {
      const result = controller.healthCheck();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      
      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
      expect(Date.parse(result.timestamp)).not.toBeNaN();
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('应该返回合理的运行时间', () => {
      const result = controller.healthCheck();
      
      // uptime 应该是正数且不会过大（不超过 1 年）
      expect(result.uptime).toBeLessThan(365 * 24 * 60 * 60);
    });
  });
});