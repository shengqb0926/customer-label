import { entities, TagRecommendation, RecommendationRule, ClusteringConfig, Customer, TagScore, FeedbackStatistic, User } from './entities';

describe('Entities Export', () => {
  it('应该导出 entities 数组', () => {
    expect(entities).toBeDefined();
    expect(Array.isArray(entities)).toBe(true);
    expect(entities.length).toBe(7);
  });

  it('应该导出 TagRecommendation 实体', () => {
    expect(TagRecommendation).toBeDefined();
    expect(typeof TagRecommendation).toBe('function');
  });

  it('应该导出 RecommendationRule 实体', () => {
    expect(RecommendationRule).toBeDefined();
    expect(typeof RecommendationRule).toBe('function');
  });

  it('应该导出 ClusteringConfig 实体', () => {
    expect(ClusteringConfig).toBeDefined();
    expect(typeof ClusteringConfig).toBe('function');
  });

  it('应该导出 Customer 实体', () => {
    expect(Customer).toBeDefined();
    expect(typeof Customer).toBe('function');
  });

  it('应该导出 TagScore 实体', () => {
    expect(TagScore).toBeDefined();
    expect(typeof TagScore).toBe('function');
  });

  it('应该导出 FeedbackStatistic 实体', () => {
    expect(FeedbackStatistic).toBeDefined();
    expect(typeof FeedbackStatistic).toBe('function');
  });

  it('应该导出 User 实体', () => {
    expect(User).toBeDefined();
    expect(typeof User).toBe('function');
  });

  it('entities 数组应该包含所有导出的实体', () => {
    expect(entities).toContain(TagRecommendation);
    expect(entities).toContain(RecommendationRule);
    expect(entities).toContain(ClusteringConfig);
    expect(entities).toContain(Customer);
    expect(entities).toContain(TagScore);
    expect(entities).toContain(FeedbackStatistic);
    expect(entities).toContain(User);
  });
});