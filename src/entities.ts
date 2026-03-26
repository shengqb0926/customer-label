import { TagRecommendation } from './modules/recommendation/entities/tag-recommendation.entity';
import { RecommendationRule } from './modules/recommendation/entities/recommendation-rule.entity';
import { ClusteringConfig } from './modules/recommendation/entities/clustering-config.entity';
import { TagScore } from './modules/scoring/entities/tag-score.entity';
import { FeedbackStatistic } from './modules/feedback/entities/feedback-statistic.entity';
import { User } from './modules/user/entities/user.entity';

export const entities = [
  TagRecommendation,
  RecommendationRule,
  ClusteringConfig,
  TagScore,
  FeedbackStatistic,
  User,
];

export {
  TagRecommendation,
  RecommendationRule,
  ClusteringConfig,
  TagScore,
  FeedbackStatistic,
  User,
};
