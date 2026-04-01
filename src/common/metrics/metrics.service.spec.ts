import { MetricsService } from './metrics.service';
import * as promClient from 'prom-client';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  afterEach(() => {
    promClient.register.clear();
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  it('应该实现 OnModuleInit 接口', () => {
    expect(service.onModuleInit).toBeDefined();
    expect(typeof service.onModuleInit).toBe('function');
  });

  describe('onModuleInit', () => {
    it('应该注册默认指标', () => {
      service.onModuleInit();
      expect(promClient.register.getMetricsAsJSON()).toBeDefined();
    });
  });

  describe('createCounter', () => {
    it('应该创建计数器', () => {
      const counter = service.createCounter('test_counter', 'Test counter help');
      expect(counter).toBeDefined();
      expect(counter.inc).toBeDefined();
    });
  });

  describe('createHistogram', () => {
    it('应该创建直方图', () => {
      const histogram = service.createHistogram('test_histogram', 'Test histogram help');
      expect(histogram).toBeDefined();
      expect(histogram.observe).toBeDefined();
    });
  });

  describe('createGauge', () => {
    it('应该创建 Gauge', () => {
      const gauge = service.createGauge('test_gauge', 'Test gauge help');
      expect(gauge).toBeDefined();
      expect(gauge.set).toBeDefined();
    });
  });

  describe('getMetrics', () => {
    it('应该获取所有指标', async () => {
      service.onModuleInit();
      const metrics = await service.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
    });
  });

  describe('clearMetrics', () => {
    it('应该清空所有指标', () => {
      service.onModuleInit();
      service.clearMetrics();
      expect(promClient.register.getMetricsAsJSON()).toBeDefined();
    });
  });
});