import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabasePoolMonitorService } from './database-pool-monitor.service';
import { DatabaseController } from './database.controller';

@Global()
@Module({
  imports: [TypeOrmModule],
  providers: [DatabasePoolMonitorService],
  exports: [DatabasePoolMonitorService],
  controllers: [DatabaseController],
})
export class DatabaseModule {}
