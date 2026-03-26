import { Module, Global, DynamicModule } from '@nestjs/common';
import { QueueService, QueueConfig } from './queue.service';

@Global()
@Module({
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {
  static forRoot(config?: QueueConfig): DynamicModule {
    return {
      module: QueueModule,
      providers: [QueueService],
      exports: [QueueService],
    };
  }
}
