import { ISimilarityAlgorithm } from '../similarity.types';

/**
 * 余弦相似度算法
 * 
 * 公式：cos(θ) = (A·B) / (||A|| × ||B||)
 * 
 * 特性：
 * - 值域：[-1, 1]，在客户特征场景中映射到 [0, 1]
 * - 对绝对数值不敏感，更关注方向一致性
 * - 适合高维稀疏向量
 */
export class CosineSimilarity implements ISimilarityAlgorithm {
  readonly name = 'cosine';

  /**
   * 计算两个向量的余弦相似度
   * @param vecA 向量 A
   * @param vecB 向量 B
   * @returns 相似度值 (0-1)，1 表示完全相同
   */
  calculate(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('向量维度必须一致');
    }

    if (vecA.length === 0) {
      return 0;
    }

    // 计算点积 A·B
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);

    // 计算模长 ||A|| 和 ||B||
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    // 防止除零错误
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    // 计算余弦相似度
    const similarity = dotProduct / (magnitudeA * magnitudeB);

    // 映射到 [0, 1] 范围（原始范围是 [-1, 1]）
    // 在客户特征场景中，所有特征都是非负的，所以结果自然在 [0, 1]
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * 批量计算相似度（性能优化版本）
   * @param targetVector 目标向量
   * @param candidateVectors 候选向量数组
   * @returns 相似度数组
   */
  batchCalculate(
    targetVector: number[], 
    candidateVectors: number[][]
  ): number[] {
    const targetMagnitude = Math.sqrt(
      targetVector.reduce((sum, val) => sum + val * val, 0)
    );

    if (targetMagnitude === 0) {
      return candidateVectors.map(() => 0);
    }

    return candidateVectors.map(candidate => {
      if (candidate.length !== targetVector.length) {
        throw new Error('候选向量维度必须与目标向量一致');
      }

      const dotProduct = targetVector.reduce(
        (sum, val, i) => sum + val * candidate[i], 
        0
      );

      const candidateMagnitude = Math.sqrt(
        candidate.reduce((sum, val) => sum + val * val, 0)
      );

      if (candidateMagnitude === 0) {
        return 0;
      }

      return Math.max(0, Math.min(1, dotProduct / (targetMagnitude * candidateMagnitude)));
    });
  }
}
