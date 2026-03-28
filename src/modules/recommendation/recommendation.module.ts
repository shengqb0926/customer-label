import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationController } from './recommendation.controller';
import { ClusteringManagerController } from './controllers/clustering-manager.controller';
import { RuleEngineController } from './controllers/rule-engine.controller';
import { CustomerController } from './controllers/customer.controller';
import { RecommendationService } from './recommendation.service';
import { CustomerService } from './services/customer.service';
import { RecommendationSeedService } from './services/recommendation-seed.service';
import { ClusteringManagerService } from './services/clustering-manager.service';
import { ConflictDetectorService } from './services/conflict-detector.service';
import { RuleEngineService } from './engines/rule-engine.service';
import { RuleParser } from './engines/rule-parser';
import { RuleEvaluator } from './engines/rule-evaluator';
import { ClusteringEngineService } from './engines/clustering-engine.service';
import { AssociationEngineService } from './engines/association-engine.service';
import { FusionEngineService } from './engines/fusion-engine.service';
import { TagRecommendation } from './entities/tag-recommendation.entity';
import { RecommendationRule } from './entities/recommendation-rule.entity';
import { ClusteringConfig } from './entities/clustering-config.entity';
import { Customer } from './entities/customer.entity';
import { RedisModule } from '../../infrastructure/redis';
import { QueueModule } from '../../infrastructure/queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TagRecommendation,
      RecommendationRule,
      ClusteringConfig,
      Customer,
    ]),
    RedisModule,
    QueueModule,
  ],
  controllers: [
    RecommendationController, 
    ClusteringManagerController,
    RuleEngineController,
    CustomerController,
  ],
  providers: [
    RecommendationService,
    CustomerService,
    RecommendationSeedService,
    ClusteringManagerService,
    ConflictDetectorService,
    RuleEngineService,
    RuleParser,
    RuleEvaluator,
    ClusteringEngineService,
    AssociationEngineService,
    FusionEngineService,
  ],
  exports: [
    RecommendationService,
    CustomerService,
    ClusteringManagerService,
    RuleEngineService,
    ClusteringEngineService,
    AssociationEngineService,
    FusionEngineService,
  ],
})
export class RecommendationModule {}