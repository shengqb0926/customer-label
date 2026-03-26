import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { TagRecommendation } from './entities/tag-recommendation.entity';
import { RecommendationRule } from './entities/recommendation-rule.entity';
import { ClusteringConfig } from './entities/clustering-config.entity';
import { RedisModule } from '../../infrastructure/redis';
import { QueueModule } from '../../infrastructure/queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TagRecommendation,
      RecommendationRule,
      ClusteringConfig,
    ]),
    RedisModule,
    QueueModule,
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
