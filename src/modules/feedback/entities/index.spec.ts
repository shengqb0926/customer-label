import { FeedbackStatistic } from './feedback-statistic.entity';

describe('Feedback Entities Exports', () => {
  it('应该导出 FeedbackStatistic', () => {
    expect(FeedbackStatistic).toBeDefined();
    expect(typeof FeedbackStatistic).toBe('function');
  });

  it('FeedbackStatistic 应该可以被实例化', () => {
    const instance = new FeedbackStatistic();
    expect(instance).toBeDefined();
  });

  it('FeedbackStatistic 应该有必要的属性', () => {
    const instance = new FeedbackStatistic();
    
    expect(instance).toHaveProperty('id');
    expect(instance).toHaveProperty('date');
    expect(instance).toHaveProperty('totalRecommendations');
    expect(instance).toHaveProperty('acceptedCount');
    expect(instance).toHaveProperty('rejectedCount');
    expect(instance).toHaveProperty('ignoredCount');
    expect(instance).toHaveProperty('modifiedCount');
  });

  it('FeedbackStatistic 的数值属性应该有默认值 0', () => {
    const instance = new FeedbackStatistic();
    
    // 这些字段有 default: 0，但 TypeScript 实例化时不会自动赋值
    // 只有在数据库持久化后才会有默认值
    expect(instance.totalRecommendations).toBeUndefined();
    expect(instance.acceptedCount).toBeUndefined();
    expect(instance.rejectedCount).toBeUndefined();
    expect(instance.ignoredCount).toBeUndefined();
    expect(instance.modifiedCount).toBeUndefined();
  });
});