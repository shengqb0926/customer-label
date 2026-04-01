import { CosineSimilarity } from './cosine.algorithm';

describe('CosineSimilarity', () => {
  let algorithm: CosineSimilarity;

  beforeEach(() => {
    algorithm = new CosineSimilarity();
  });

  describe('基本信息', () => {
    it('应该有正确的名称', () => {
      expect(algorithm.name).toBe('cosine');
    });
  });

  describe('calculate', () => {
    it('应该计算两个相同向量的相似度为 1', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2, 3];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBe(1);
    });

    it('应该计算两个正交向量的相似度为 0', () => {
      const vecA = [1, 0];
      const vecB = [0, 1];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBe(0);
    });

    it('应该计算不同向量的相似度在 0-1 之间', () => {
      const vecA = [1, 2, 3];
      const vecB = [4, 5, 6];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('空向量应该返回 0', () => {
      const similarity = algorithm.calculate([], []);
      expect(similarity).toBe(0);
    });

    it('维度不一致应该抛出错误', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2];
      
      expect(() => algorithm.calculate(vecA, vecB)).toThrow('向量维度必须一致');
    });

    it('零向量应该返回 0', () => {
      const vecA = [0, 0, 0];
      const vecB = [1, 2, 3];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBe(0);
    });

    it('应该处理单位向量', () => {
      const vecA = [1, 0, 0];
      const vecB = [1, 0, 0];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBe(1);
    });

    it('应该处理负值向量', () => {
      const vecA = [-1, -2, -3];
      const vecB = [-1, -2, -3];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBe(1);
    });

    it('应该映射结果到 [0, 1] 范围', () => {
      // 理论上余弦相似度可能是负的，但我们的实现应该映射到 [0, 1]
      const vecA = [1, 0];
      const vecB = [-1, 0];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('batchCalculate', () => {
    it('应该批量计算相似度', () => {
      const target = [1, 2, 3];
      const candidates = [
        [1, 2, 3],      // 完全相同
        [4, 5, 6],      // 不同
        [1, 2, 3],      // 完全相同
      ];
      
      const similarities = algorithm.batchCalculate(target, candidates);
      
      expect(similarities.length).toBe(3);
      expect(similarities[0]).toBe(1);
      expect(similarities[2]).toBe(1);
      expect(similarities[1]).toBeLessThan(1);
    });

    it('空候选列表应该返回空数组', () => {
      const target = [1, 2, 3];
      const similarities = algorithm.batchCalculate(target, []);
      expect(similarities).toEqual([]);
    });

    it('目标向量为零向量应该返回全 0', () => {
      const target = [0, 0, 0];
      const candidates = [[1, 2, 3], [4, 5, 6]];
      
      const similarities = algorithm.batchCalculate(target, candidates);
      
      expect(similarities).toEqual([0, 0]);
    });

    it('候选向量为零向量应该返回 0', () => {
      const target = [1, 2, 3];
      const candidates = [[0, 0, 0], [1, 2, 3]];
      
      const similarities = algorithm.batchCalculate(target, candidates);
      
      expect(similarities[0]).toBe(0);
      expect(similarities[1]).toBe(1);
    });

    it('维度不一致应该抛出错误', () => {
      const target = [1, 2, 3];
      const candidates = [[1, 2]]; // 维度不匹配
      
      expect(() => algorithm.batchCalculate(target, candidates))
        .toThrow('候选向量维度必须与目标向量一致');
    });

    it('应该处理大量候选向量', () => {
      const target = Array.from({ length: 100 }, (_, i) => i);
      const candidates = Array.from({ length: 50 }, (_, i) => 
        Array.from({ length: 100 }, (_, j) => j + i)
      );
      
      const similarities = algorithm.batchCalculate(target, candidates);
      
      expect(similarities.length).toBe(50);
      similarities.forEach(sim => {
        expect(sim).toBeGreaterThanOrEqual(0);
        expect(sim).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理非常大的数值', () => {
      const vec1 = [1e10, 2e10, 3e10];
      const vec2 = [1e10, 2e10, 3e10];
      // 使用 toBeCloseTo 来处理浮点数精度问题
      expect(algorithm.calculate(vec1, vec2)).toBeCloseTo(1, 5);
    });

    it('应该处理非常小的数值', () => {
      const vec1 = [1e-10, 2e-10, 3e-10];
      const vec2 = [1e-10, 2e-10, 3e-10];
      expect(algorithm.calculate(vec1, vec2)).toBeCloseTo(1, 5);
    });

    it('单个元素的向量', () => {
      const vecA = [5];
      const vecB = [5];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBe(1);
    });
  });

  describe('实际场景测试', () => {
    it('客户特征相似度计算', () => {
      // 客户 A: 年龄 30, 资产 50000, 年消费 20000
      const customerA = [30, 50000, 20000];
      // 客户 B: 年龄 32, 资产 55000, 年消费 22000
      const customerB = [32, 55000, 22000];
      // 客户 C: 年龄 45, 资产 200000, 年消费 80000
      const customerC = [45, 200000, 80000];
      
      const simAB = algorithm.calculate(customerA, customerB);
      const simAC = algorithm.calculate(customerA, customerC);
      
      // A 和 B 更相似
      expect(simAB).toBeGreaterThan(simAC);
    });
  });
});
