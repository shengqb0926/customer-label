import { QueueModule } from './queue.module';
import { QueueService } from './queue.service';

describe('Queue Module Exports', () => {
  it('应该导出 QueueModule', () => {
    expect(QueueModule).toBeDefined();
    expect(typeof QueueModule).toBe('function');
  });

  it('应该导出 QueueService', () => {
    expect(QueueService).toBeDefined();
    expect(typeof QueueService).toBe('function');
  });

  it('QueueModule 应该是有效的 NestJS 模块类', () => {
    expect(QueueModule.toString()).toContain('class');
  });

  it('QueueService 和 QueueModule 应该是不同的类', () => {
    expect(QueueService).not.toBe(QueueModule);
  });
});