import { SimilarityService } from './similarity.service';
import { SimilarityModule } from './similarity.module';
import { CosineSimilarity } from './algorithms/cosine.algorithm';
import { EuclideanSimilarity } from './algorithms/euclidean.algorithm';
import * as similarityTypes from './similarity.types';

describe('Similarity Module Exports', () => {
  it('应该导出 SimilarityService', () => {
    expect(SimilarityService).toBeDefined();
    expect(typeof SimilarityService).toBe('function');
  });

  it('应该导出 SimilarityModule', () => {
    expect(SimilarityModule).toBeDefined();
    expect(typeof SimilarityModule).toBe('function');
  });

  it('应该导出 CosineSimilarity', () => {
    expect(CosineSimilarity).toBeDefined();
    expect(typeof CosineSimilarity).toBe('function');
  });

  it('应该导出 EuclideanSimilarity', () => {
    expect(EuclideanSimilarity).toBeDefined();
    expect(typeof EuclideanSimilarity).toBe('function');
  });

  it('应该导出 similarity types', () => {
    expect(similarityTypes).toBeDefined();
  });

  it('算法类应该可以被实例化', () => {
    const cosine = new CosineSimilarity();
    const euclidean = new EuclideanSimilarity();
    
    expect(cosine).toBeDefined();
    expect(euclidean).toBeDefined();
  });

  it('CosineSimilarity 应该有 calculate 方法', () => {
    const instance = new CosineSimilarity();
    expect(instance.calculate).toBeDefined();
    expect(typeof instance.calculate).toBe('function');
  });

  it('EuclideanSimilarity 应该有 calculate 方法', () => {
    const instance = new EuclideanSimilarity();
    expect(instance.calculate).toBeDefined();
    expect(typeof instance.calculate).toBe('function');
  });
});