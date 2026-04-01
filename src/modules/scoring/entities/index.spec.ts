import { TagScore } from './tag-score.entity';

describe('Scoring Entities Exports', () => {
  it('应该导出 TagScore', () => {
    expect(TagScore).toBeDefined();
    expect(typeof TagScore).toBe('function');
  });

  it('TagScore 应该可以被实例化', () => {
    const instance = new TagScore();
    expect(instance).toBeDefined();
  });

  it('TagScore 应该有必要的属性', () => {
    const instance = new TagScore();
    
    expect(instance).toHaveProperty('tagId');
    expect(instance).toHaveProperty('tagName');
    expect(instance).toHaveProperty('overallScore');
    expect(instance).toHaveProperty('coverageScore');
    expect(instance).toHaveProperty('discriminationScore');
    expect(instance).toHaveProperty('stabilityScore');
    expect(instance).toHaveProperty('businessValueScore');
    expect(instance).toHaveProperty('recommendation');
  });

  it('TagScore 的 recommendation 应该有默认值', () => {
    const instance = new TagScore();
    // recommendation 字段没有默认值，是 nullable 的
    expect(instance.recommendation).toBeUndefined();
  });
});