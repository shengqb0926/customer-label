import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoringController } from './scoring.controller';
import { ScoringService } from './scoring.service';
import { TagScore } from './entities/tag-score.entity';
import { RedisModule } from '../../infrastructure/redis';

@Module({
  imports: [
    TypeOrmModule.forFeature([TagScore]),
    RedisModule,
  ],
  controllers: [ScoringController],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
