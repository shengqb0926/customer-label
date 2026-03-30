import { ISimilarityAlgorithm } from '../similarity.types';

/**
 * 欧几里得距离相似度算法
 * 
 * 公式：similarity = 1 / (1 + distance)
 * 其中 distance = √(Σ(ai - bi)²)
 * 
 * 特性：
 * - 对绝对数值敏感
 * - 适合低维密集向量
 * - 计算简单直观
 */
export class EuclideanSimilarity implements ISimilarityAlgorithm {
  readonly name = 'euclidean';

  /**
   * 计算两个向量的欧几里得相似度
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

    // 计算欧几里得距离
    const distance = Math.sqrt(
      vecA.reduce((sum, a, i) => {
        const diff = a - vecB[i];
        return sum + diff * diff;
      }, 0)
    );

    // 转换为相似度 (0-1)
    // distance 越小，similarity 越大
    return 1 / (1 + distance);
  }
}
