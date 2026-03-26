import { Module, Global } from '@nestjs/common';
import { DistributedLockService } from './distributed-lock.service';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [DistributedLockService],
  exports: [DistributedLockService],
})
export class LockModule {}
