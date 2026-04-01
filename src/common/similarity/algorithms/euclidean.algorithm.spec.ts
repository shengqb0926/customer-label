import { EuclideanSimilarity } from './euclidean.algorithm';

describe('EuclideanSimilarity', () => {
  let algorithm: EuclideanSimilarity;

  beforeEach(() => {
    algorithm = new EuclideanSimilarity();
  });

  describe('基本信息', () => {
    it('应该有正确的名称', () => {
      expect(algorithm.name).toBe('euclidean');
    });
  });

  describe('calculate', () => {
    it('应该计算两个相同向量的相似度为 1', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2, 3];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBe(1);
    });

    it('应该计算两个不同向量的相似度在 0-1 之间', () => {
      const vecA = [1, 2, 3];
      const vecB = [4, 5, 6];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('距离越大相似度越小', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2, 3]; // 相同
      const vecC = [100, 200, 300]; // 很远
      
      const simAB = algorithm.calculate(vecA, vecB);
      const simAC = algorithm.calculate(vecA, vecC);
      
      expect(simAB).toBe(1);
      expect(simAC).toBeLessThan(simAB);
      expect(simAC).toBeGreaterThan(0);
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

    it('零向量应该返回 1', () => {
      // 两个零向量的距离为 0，所以相似度为 1
      const vecA = [0, 0, 0];
      const vecB = [0, 0, 0];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBe(1);
    });

    it('一个为零向量应该返回较小的相似度', () => {
      const vecA = [0, 0, 0];
      const vecB = [1, 2, 3];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBeLessThan(1);
      expect(similarity).toBeGreaterThan(0);
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

    it('正负相反的向量应该返回较小的相似度', () => {
      const vecA = [1, 2, 3];
      const vecB = [-1, -2, -3];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('边界情况', () => {
    it('应该处理空向量', () => {
      // 两个空向量返回 0（没有信息可以比较）
      expect(algorithm.calculate([], [])).toBe(0);
    });

    it('应该处理一个为空的情况', () => {
      // 维度不一致会抛出错误
      expect(() => algorithm.calculate([1, 2, 3], [])).toThrow('向量维度必须一致');
      expect(() => algorithm.calculate([], [1, 2, 3])).toThrow('向量维度必须一致');
    });

    it('应该处理维度不匹配的情况', () => {
      // 欧几里得距离对于维度不匹配的向量会抛出错误
      expect(() => algorithm.calculate([1, 2, 3], [4, 5])).toThrow('向量维度必须一致');
    });

    it('两个差异很大的向量应该接近 0', () => {
      const vec1 = [1, 1, 1];
      const vec2 = [100, 100, 100];
      const result = algorithm.calculate(vec1, vec2);
      // 欧几里得相似度不会完全为 0，但应该非常小
      expect(result).toBeLessThan(0.01);
    });

    it('应该处理非常大的数值', () => {
      const vecA = [1000000, 2000000, 3000000];
      const vecB = [1000000, 2000000, 3000000];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBe(1);
    });

    it('应该处理非常小的数值', () => {
      const vecA = [0.000001, 0.000002, 0.000003];
      const vecB = [0.000001, 0.000002, 0.000003];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBe(1);
    });

    it('单个元素的向量', () => {
      const vecA = [5];
      const vecB = [5];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      expect(similarity).toBe(1);
    });

    it('两个差异很大的向量', () => {
      const vecA = [0, 0, 0];
      const vecB = [1000, 1000, 1000];
      
      const similarity = algorithm.calculate(vecA, vecB);
      
      // 欧几里得相似度对于完全不同的向量接近 0，但不会完全为 0
      expect(similarity).toBeLessThan(0.01);
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

    it('地理位置坐标相似度', () => {
      // 北京 coordinates (approximate)
      const beijing = [39.9042, 116.4074];
      // 上海 coordinates
      const shanghai = [31.2304, 121.4737];
      // 另一个北京附近的点
      const nearBeijing = [40.0, 116.5];
      
      const simBJ_SH = algorithm.calculate(beijing, shanghai);
      const simBJ_NearBJ = algorithm.calculate(beijing, nearBeijing);
      
      // 北京和附近点的相似度应该更高
      expect(simBJ_NearBJ).toBeGreaterThan(simBJ_SH);
    });
  });

  describe('性能测试', () => {
    it('应该快速计算高维向量', () => {
      const vecA = Array.from({ length: 1000 }, (_, i) => i);
      const vecB = Array.from({ length: 1000 }, (_, i) => i + 1);
      
      const start = Date.now();
      const similarity = algorithm.calculate(vecA, vecB);
      const duration = Date.now() - start;
      
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
      expect(duration).toBeLessThan(100); // 应该在 100ms 内完成
    });
  });
});
