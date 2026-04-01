import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('应该被定义', () => {
    expect(controller).toBeDefined();
  });

  it('应该返回欢迎信息', () => {
    const result = controller.welcome();
    expect(result.name).toBe('客户标签智能推荐系统 API');
    expect(result.version).toBe('v1');
    expect(result.status).toBe('running');
  });

  it('应该返回健康状态', async () => {
    const result = await controller.health();
    expect(result.status).toBe('ok');
  });

  it('应该返回就绪状态', async () => {
    const result = await controller.ready();
    expect(result.status).toBe('ok');
  });

  it('应该返回指标', async () => {
    const result = await controller.metrics();
    expect(typeof result).toBe('string');
  });
});
