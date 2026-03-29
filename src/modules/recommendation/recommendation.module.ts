import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationController } from './recommendation.controller';
import { ClusteringManagerController } from './controllers/clustering-manager.controller';
import { AssociationManagerController } from './controllers/association-manager.controller';
import { RuleEngineController } from './controllers/rule-engine.controller';
import { CustomerController } from './controllers/customer.controller';
import { RecommendationService } from './recommendation.service';
import { CustomerService } from './services/customer.service';
import { RfmAnalysisService } from './services/rfm-analysis.service';
import { RecommendationSeedService } from './services/recommendation-seed.service';
import { ClusteringManagerService } from './services/clustering-manager.service';
import { AssociationManagerService } from './services/association-manager.service';
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
import { AssociationConfig } from './entities/association-config.entity';
import { Customer } from './entities/customer.entity';
import { CustomerTag } from './entities/customer-tag.entity';
import { RedisModule } from '../../infrastructure/redis';
import { QueueModule } from '../../infrastructure/queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TagRecommendation,
      RecommendationRule,
      ClusteringConfig,
      AssociationConfig,
      Customer,
      CustomerTag,
    ]),
    RedisModule,
    QueueModule,
  ],
  controllers: [
    RecommendationController, 
    ClusteringManagerController,
    AssociationManagerController,
    RuleEngineController,
    CustomerController,
  ],
  providers: [
    RecommendationService,
    CustomerService,
    RfmAnalysisService,
    RecommendationSeedService,
    ClusteringManagerService,
    AssociationManagerService,
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
    RfmAnalysisService,
  ],
})
export class RecommendationModule {}
