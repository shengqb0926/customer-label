import { TagRecommendation } from './tag-recommendation.entity';
import { RecommendationRule } from './recommendation-rule.entity';
import { ClusteringConfig } from './clustering-config.entity';

describe('Recommendation Entities Exports', () => {
  it('应该导出 TagRecommendation', () => {
    expect(TagRecommendation).toBeDefined();
    expect(typeof TagRecommendation).toBe('function');
  });

  it('应该导出 RecommendationRule', () => {
    expect(RecommendationRule).toBeDefined();
    expect(typeof RecommendationRule).toBe('function');
  });

  it('应该导出 ClusteringConfig', () => {
    expect(ClusteringConfig).toBeDefined();
    expect(typeof ClusteringConfig).toBe('function');
  });

  it('所有实体类都应该可以被实例化', () => {
    const tagRec = new TagRecommendation();
    const rule = new RecommendationRule();
    const config = new ClusteringConfig();
    
    expect(tagRec).toBeDefined();
    expect(rule).toBeDefined();
    expect(config).toBeDefined();
  });

  it('TagRecommendation 应该有必要的属性', () => {
    const instance = new TagRecommendation();
    
    // 使用 id 而不是 tagId
    expect(instance).toHaveProperty('id');
    expect(instance).toHaveProperty('tagName');
    expect(instance).toHaveProperty('confidence');
  });

  it('RecommendationRule 应该有必要的属性', () => {
    const instance = new RecommendationRule();
    
    // 使用 id 而不是 ruleId
    expect(instance).toHaveProperty('id');
    expect(instance).toHaveProperty('ruleName');
    expect(instance).toHaveProperty('ruleExpression');
  });

  it('ClusteringConfig 应该有必要的属性', () => {
    const instance = new ClusteringConfig();
    
    // 使用 id 而不是 configId
    expect(instance).toHaveProperty('id');
    expect(instance).toHaveProperty('configName');
    expect(instance).toHaveProperty('parameters');
  });
});