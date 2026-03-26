import { Test, TestingModule } from '@nestjs/testing';
import { FusionEngineService, FusionWeights } from './fusion-engine.service';
import { CreateRecommendationDto } from '../entities/tag-recommendation.entity';

describe('FusionEngineService', () => {
  let fusionEngine: FusionEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FusionEngineService],
    }).compile();

    fusionEngine = module.get<FusionEngineService>(FusionEngineService);
  });

  it('should be defined', () => {
    expect(fusionEngine).toBeDefined();
  });

  describe('fuseRecommendations', () => {
    const mockRecommendations: CreateRecommendationDto[] = [
      {
        customerId: 1,
        tagName: '高价值客户',
        tagCategory: '客户价值',
        confidence: 0.9,
        source: 'rule',
        reason: '规则匹配：高价值客户识别',
      },
      {
        customerId: 1,
        tagName: '高价值客户',
        tagCategory: '客户价值',
        confidence: 0.85,
        source: 'clustering',
        reason: '簇 0 特征：高资产高收入',
      },
      {
        customerId: 1,
        tagName: '流失风险',
        tagCategory: '风险预警',
        confidence: 0.75,
        source: 'rule',
        reason: '规则匹配：流失风险预警',
      },
      {
        customerId: 1,
        tagName: '交叉销售目标',
        tagCategory: '营销机会',
        confidence: 0.8,
        source: 'association',
        reason: '基于关联规则：高价值客户 → 交叉销售目标',
      },
    ];

    it('should fuse multiple recommendations for the same tag', async () => {
      const result = await fusionEngine.fuseRecommendations(mockRecommendations);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(mockRecommendations.length);
      
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('customerId');
        expect(result[0]).toHaveProperty('tagName');
        expect(result[0]).toHaveProperty('confidence');
        expect(result[0].source).toContain('+'); // 多来源应该有 + 号
      }
    });

    it('should return empty array for empty input', async () => {
      const result = await fusionEngine.fuseRecommendations([]);

      expect(result).toEqual([]);
    });

    it('should respect maxResults option', async () => {
      const result = await fusionEngine.fuseRecommendations(mockRecommendations, undefined, {
        maxResults: 2,
      });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should filter by minConfidence', async () => {
      const result = await fusionEngine.fuseRecommendations(mockRecommendations, undefined, {
        minConfidence: 0.8,
      });

      result.forEach((rec: CreateRecommendationDto) => {
        expect(rec.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should use custom weights when provided', async () => {
      const customWeights: Partial<FusionWeights> = {
        rule: 0.6,
        clustering: 0.3,
        association: 0.1,
      };

      const result = await fusionEngine.fuseRecommendations(
        mockRecommendations,
        customWeights
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle deduplication', async () => {
      const duplicateRecs: CreateRecommendationDto[] = [
        {
          customerId: 1,
          tagName: '高价值客户',
          tagCategory: '客户价值',
          confidence: 0.9,
          source: 'rule',
          reason: 'Reason 1',
        },
        {
          customerId: 1,
          tagName: '高价值客户',
          tagCategory: '客户价值',
          confidence: 0.85,
          source: 'rule',
          reason: 'Reason 2',
        },
      ];

      const result = await fusionEngine.fuseRecommendations(duplicateRecs, undefined, {
        deduplicate: true,
      });

      // 相同标签应该被融合为一个
      expect(result.length).toBe(1);
      expect(result[0].tagName).toBe('高价值客户');
    });
  });

  describe('fuseSingleTag', () => {
    const mockRecs: CreateRecommendationDto[] = [
      {
        customerId: 1,
        tagName: 'Test Tag',
        tagCategory: 'Test Category',
        confidence: 0.9,
        source: 'rule',
        reason: 'Rule match',
      },
      {
        customerId: 1,
        tagName: 'Test Tag',
        tagCategory: 'Test Category',
        confidence: 0.8,
        source: 'clustering',
        reason: 'Cluster match',
      },
    ];

    const defaultWeights: FusionWeights = {
      rule: 0.4,
      clustering: 0.35,
      association: 0.25,
    };

    it('should fuse multiple recommendations for a single tag', () => {
      const result = (fusionEngine as any).fuseSingleTag('Test Tag', mockRecs, defaultWeights);

      expect(result).toHaveProperty('fusedConfidence');
      expect(result.fusedConfidence).toBeGreaterThan(0);
      expect(result.allSources).toHaveLength(2);
      expect(result.explanations).toHaveLength(2);
    });

    it('should calculate weighted confidence correctly', () => {
      const result = (fusionEngine as any).fuseSingleTag('Test Tag', mockRecs, defaultWeights);

      // Rule: 0.9 * 0.4 = 0.36
      // Clustering: 0.8 * 0.35 = 0.28
      // Total weight: 0.75
      // Normalized: (0.36 + 0.28) / 0.75 = 0.853...
      // Multi-source bonus: 0.853 * 1.1 = 0.938...
      expect(result.fusedConfidence).toBeGreaterThan(0.85);
    });

    it('should cap fused confidence at 1.0', () => {
      const perfectRecs: CreateRecommendationDto[] = [
        {
          customerId: 1,
          tagName: 'Perfect Tag',
          tagCategory: 'Test',
          confidence: 1.0,
          source: 'rule',
          reason: 'Perfect rule',
        },
        {
          customerId: 1,
          tagName: 'Perfect Tag',
          tagCategory: 'Test',
          confidence: 1.0,
          source: 'clustering',
          reason: 'Perfect cluster',
        },
        {
          customerId: 1,
          tagName: 'Perfect Tag',
          tagCategory: 'Test',
          confidence: 1.0,
          source: 'association',
          reason: 'Perfect association',
        },
      ];

      const result = (fusionEngine as any).fuseSingleTag('Perfect Tag', perfectRecs, defaultWeights);

      expect(result.fusedConfidence).toBeLessThanOrEqual(1.0);
    });

    it('should select best category from multiple recommendations', () => {
      const mixedCategoryRecs: CreateRecommendationDto[] = [
        {
          customerId: 1,
          tagName: 'Mixed Tag',
          tagCategory: 'Category A',
          confidence: 0.9,
          source: 'rule',
          reason: 'Reason 1',
        },
        {
          customerId: 1,
          tagName: 'Mixed Tag',
          tagCategory: 'Category A',
          confidence: 0.8,
          source: 'clustering',
          reason: 'Reason 2',
        },
        {
          customerId: 1,
          tagName: 'Mixed Tag',
          tagCategory: 'Category B',
          confidence: 0.7,
          source: 'association',
          reason: 'Reason 3',
        },
      ];

      const result = (fusionEngine as any).fuseSingleTag('Mixed Tag', mixedCategoryRecs, defaultWeights);

      expect(result.tagCategory).toBe('Category A'); // Most frequent
    });
  });

  describe('groupByTagName', () => {
    const mockRecs: CreateRecommendationDto[] = [
      {
        customerId: 1,
        tagName: 'Tag A',
        tagCategory: 'Cat 1',
        confidence: 0.9,
        source: 'rule',
        reason: 'Reason 1',
      },
      {
        customerId: 1,
        tagName: 'Tag B',
        tagCategory: 'Cat 2',
        confidence: 0.8,
        source: 'clustering',
        reason: 'Reason 2',
      },
      {
        customerId: 1,
        tagName: 'Tag A',
        tagCategory: 'Cat 1',
        confidence: 0.85,
        source: 'clustering',
        reason: 'Reason 3',
      },
    ];

    it('should group recommendations by tag name', () => {
      const grouped = (fusionEngine as any).groupByTagName(mockRecs);

      expect(grouped.size).toBe(2);
      expect(grouped.get('Tag A')).toHaveLength(2);
      expect(grouped.get('Tag B')).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const grouped = (fusionEngine as any).groupByTagName([]);

      expect(grouped.size).toBe(0);
    });
  });

  describe('selectBestCategory', () => {
    it('should select most frequent category', () => {
      const recs: CreateRecommendationDto[] = [
        {
          customerId: 1,
          tagName: 'Test',
          tagCategory: 'Category A',
          confidence: 0.9,
          source: 'rule',
          reason: 'R1',
        },
        {
          customerId: 1,
          tagName: 'Test',
          tagCategory: 'Category A',
          confidence: 0.8,
          source: 'clustering',
          reason: 'R2',
        },
        {
          customerId: 1,
          tagName: 'Test',
          tagCategory: 'Category B',
          confidence: 0.7,
          source: 'association',
          reason: 'R3',
        },
      ];

      const result = (fusionEngine as any).selectBestCategory(recs);

      expect(result).toBe('Category A');
    });

    it('should handle single recommendation', () => {
      const recs: CreateRecommendationDto[] = [
        {
          customerId: 1,
          tagName: 'Test',
          tagCategory: 'Single Category',
          confidence: 0.9,
          source: 'rule',
          reason: 'R1',
        },
      ];

      const result = (fusionEngine as any).selectBestCategory(recs);

      expect(result).toBe('Single Category');
    });
  });

  describe('generateReason', () => {
    it('should generate reason with multiple sources', () => {
      const fused = {
        customerId: 1,
        tagName: 'Test Tag',
        tagCategory: 'Test',
        confidence: 0.85,
        source: 'rule',
        reason: 'Primary reason',
        allSources: ['rule', 'clustering'],
        sourceConfidences: { rule: 0.9, clustering: 0.8 },
        fusedConfidence: 0.85,
        explanations: ['Rule match', 'Cluster match'],
      };

      const result = (fusionEngine as any).generateReason(fused);

      expect(result).toContain('rule、clustering');
      expect(result).toContain('多引擎联合推荐');
    });

    it('should include average confidence for multi-source', () => {
      const fused = {
        customerId: 1,
        tagName: 'Test Tag',
        tagCategory: 'Test',
        confidence: 0.85,
        source: 'rule',
        reason: '',
        allSources: ['rule', 'clustering'],
        sourceConfidences: { rule: 0.9, clustering: 0.8 },
        fusedConfidence: 0.85,
        explanations: [],
      };

      const result = (fusionEngine as any).generateReason(fused);

      expect(result).toContain('平均置信度');
    });

    it('should handle single source', () => {
      const fused = {
        customerId: 1,
        tagName: 'Test Tag',
        tagCategory: 'Test',
        confidence: 0.9,
        source: 'rule',
        reason: 'Single source',
        allSources: ['rule'],
        sourceConfidences: { rule: 0.9 },
        fusedConfidence: 0.9,
        explanations: ['Single source reason'],
      };

      const result = (fusionEngine as any).generateReason(fused);

      expect(result).not.toContain('平均置信度');
    });
  });

  describe('filterExistingTags', () => {
    const mockRecs: CreateRecommendationDto[] = [
      {
        customerId: 1,
        tagName: 'Existing Tag',
        tagCategory: 'Cat 1',
        confidence: 0.9,
        source: 'rule',
        reason: 'R1',
      },
      {
        customerId: 1,
        tagName: 'New Tag',
        tagCategory: 'Cat 2',
        confidence: 0.8,
        source: 'clustering',
        reason: 'R2',
      },
      {
        customerId: 1,
        tagName: 'Another New Tag',
        tagCategory: 'Cat 3',
        confidence: 0.7,
        source: 'association',
        reason: 'R3',
      },
    ];

    it('should filter out existing tags', () => {
      const existingTags = ['Existing Tag', 'Another Existing Tag'];

      const result = fusionEngine.filterExistingTags(mockRecs, existingTags);

      expect(result.length).toBe(2);
      expect(result.some(r => r.tagName === 'Existing Tag')).toBe(false);
    });

    it('should be case-insensitive', () => {
      const existingTags = ['existing tag'];

      const result = fusionEngine.filterExistingTags(mockRecs, existingTags);

      expect(result.some(r => r.tagName === 'Existing Tag')).toBe(false);
    });

    it('should keep all tags when none exist', () => {
      const existingTags = ['Non-existent Tag'];

      const result = fusionEngine.filterExistingTags(mockRecs, existingTags);

      expect(result.length).toBe(mockRecs.length);
    });
  });

  describe('setWeights and getWeights', () => {
    it('should update weights with setWeights', () => {
      const newWeights: Partial<FusionWeights> = {
        rule: 0.5,
        clustering: 0.3,
        association: 0.2,
      };

      fusionEngine.setWeights(newWeights);

      const currentWeights = fusionEngine.getWeights();

      expect(currentWeights.rule).toBe(0.5);
      expect(currentWeights.clustering).toBe(0.3);
      expect(currentWeights.association).toBe(0.2);
    });

    it('should return copy of weights with getWeights', () => {
      const weights1 = fusionEngine.getWeights();
      const weights2 = fusionEngine.getWeights();

      expect(weights1).toEqual(weights2);
      expect(weights1).not.toBe(weights2); // Should be different instances
    });

    it('should merge partial weights', () => {
      const originalWeights = fusionEngine.getWeights();

      fusionEngine.setWeights({ rule: 0.6 });

      const updatedWeights = fusionEngine.getWeights();

      expect(updatedWeights.rule).toBe(0.6);
      expect(updatedWeights.clustering).toBe(originalWeights.clustering);
      expect(updatedWeights.association).toBe(originalWeights.association);
    });
  });

  describe('default weights', () => {
    it('should have default rule weight of 0.4', () => {
      const weights = fusionEngine.getWeights();
      expect(weights.rule).toBe(0.4);
    });

    it('should have default clustering weight of 0.35', () => {
      const weights = fusionEngine.getWeights();
      expect(weights.clustering).toBe(0.35);
    });

    it('should have default association weight of 0.25', () => {
      const weights = fusionEngine.getWeights();
      expect(weights.association).toBe(0.25);
    });
  });
});
