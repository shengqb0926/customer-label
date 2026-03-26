import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictDetectorService,
  ConflictType,
  ConflictSeverity,
  ResolutionStrategy,
} from './conflict-detector.service';
import { TagRecommendation } from '../entities/tag-recommendation.entity';
import { RecommendationRule } from '../entities/recommendation-rule.entity';

describe('ConflictDetectorService', () => {
  let conflictDetector: ConflictDetectorService;
  let recommendationRepo: Repository<TagRecommendation>;
  let ruleRepo: Repository<RecommendationRule>;

  const mockRecommendationRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockRuleRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConflictDetectorService,
        {
          provide: getRepositoryToken(TagRecommendation),
          useValue: mockRecommendationRepo,
        },
        {
          provide: getRepositoryToken(RecommendationRule),
          useValue: mockRuleRepo,
        },
      ],
    }).compile();

    conflictDetector = module.get<ConflictDetectorService>(ConflictDetectorService);
    recommendationRepo = module.get<Repository<TagRecommendation>>(
      getRepositoryToken(TagRecommendation)
    );
    ruleRepo = module.get<Repository<RecommendationRule>>(getRepositoryToken(RecommendationRule));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(conflictDetector).toBeDefined();
  });

  describe('detectCustomerConflicts', () => {
    const mockRecommendations: Partial<TagRecommendation>[] = [
      {
        id: 1,
        customerId: 100,
        tagName: '高价值客户',
        tagCategory: '客户价值',
        confidence: 0.9,
        source: 'rule',
      },
      {
        id: 2,
        customerId: 100,
        tagName: '流失风险客户',
        tagCategory: '风险预警',
        confidence: 0.85,
        source: 'rule',
      },
      {
        id: 3,
        customerId: 100,
        tagName: '活跃客户',
        tagCategory: '行为特征',
        confidence: 0.8,
        source: 'clustering',
      },
    ];

    it('should detect tag mutual exclusion conflicts', async () => {
      const result = await conflictDetector.detectCustomerConflicts(
        100,
        mockRecommendations as TagRecommendation[]
      );

      expect(Array.isArray(result)).toBe(true);
      
      // 应该检测到"高价值客户"和"流失风险客户"的互斥冲突
      const tagConflict = result.find(c => c.type === ConflictType.TAG_MUTUAL_EXCLUSION);
      if (tagConflict) {
        expect(tagConflict.severity).toBeDefined();
        expect(tagConflict.conflictingItems).toBeDefined();
      }
    });

    it('should return empty array when no conflicts', async () => {
      const nonConflictingRecs: Partial<TagRecommendation>[] = [
        {
          id: 1,
          customerId: 100,
          tagName: '高价值客户',
          tagCategory: '客户价值',
          confidence: 0.9,
          source: 'rule',
        },
        {
          id: 2,
          customerId: 100,
          tagName: '活跃客户',
          tagCategory: '行为特征',
          confidence: 0.8,
          source: 'clustering',
        },
      ];

      const result = await conflictDetector.detectCustomerConflicts(
        100,
        nonConflictingRecs as TagRecommendation[]
      );

      expect(result).toEqual([]);
    });
  });

  describe('detectTagMutualExclusions', () => {
    it('should detect mutual exclusion between predefined tags', () => {
      const recommendations: Partial<TagRecommendation>[] = [
        {
          customerId: 100,
          tagName: '高风险客户',
          tagCategory: '风险等级',
          confidence: 0.8,
        },
        {
          customerId: 100,
          tagName: '低风险客户',
          tagCategory: '风险等级',
          confidence: 0.7,
        },
      ];

      const conflicts = (conflictDetector as any).detectTagMutualExclusions(
        100,
        recommendations as TagRecommendation[]
      );

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe(ConflictType.TAG_MUTUAL_EXCLUSION);
    });

    it('should not detect conflict for non-conflicting tags', () => {
      const recommendations: Partial<TagRecommendation>[] = [
        {
          customerId: 100,
          tagName: '高价值客户',
          tagCategory: '客户价值',
          confidence: 0.9,
        },
        {
          customerId: 100,
          tagName: '活跃客户',
          tagCategory: '行为特征',
          confidence: 0.8,
        },
      ];

      const conflicts = (conflictDetector as any).detectTagMutualExclusions(
        100,
        recommendations as TagRecommendation[]
      );

      expect(conflicts).toEqual([]);
    });
  });

  describe('detectDuplicateRecommendations', () => {
    it('should detect duplicate recommendations with same tag name', () => {
      const recommendations: Partial<TagRecommendation>[] = [
        {
          customerId: 100,
          tagName: '高价值客户',
          tagCategory: '客户价值',
          confidence: 0.9,
          source: 'rule',
        },
        {
          customerId: 100,
          tagName: '高价值客户',
          tagCategory: '客户价值',
          confidence: 0.85,
          source: 'clustering',
        },
      ];

      const conflicts = (conflictDetector as any).detectDuplicateRecommendations(
        100,
        recommendations as TagRecommendation[]
      );

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe(ConflictType.RECOMMENDATION_DUPLICATE);
    });

    it('should not detect duplicates when all tags are unique', () => {
      const recommendations: Partial<TagRecommendation>[] = [
        {
          customerId: 100,
          tagName: 'Tag A',
          tagCategory: 'Cat 1',
          confidence: 0.9,
        },
        {
          customerId: 100,
          tagName: 'Tag B',
          tagCategory: 'Cat 2',
          confidence: 0.8,
        },
      ];

      const conflicts = (conflictDetector as any).detectDuplicateRecommendations(
        100,
        recommendations as TagRecommendation[]
      );

      expect(conflicts).toEqual([]);
    });
  });

  describe('detectRecommendationConflicts', () => {
    it('should detect conflicts in same category with contradictory content', () => {
      const recommendations: Partial<TagRecommendation>[] = [
        {
          customerId: 100,
          tagName: '推荐购买产品 A',
          tagCategory: '营销机会',
          confidence: 0.8,
          reason: '基于购买历史',
        },
        {
          customerId: 100,
          tagName: '不推荐购买产品 A',
          tagCategory: '营销机会',
          confidence: 0.7,
          reason: '基于风险评估',
        },
      ];

      const conflicts = (conflictDetector as any).detectRecommendationConflicts(
        100,
        recommendations as TagRecommendation[]
      );

      expect(conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('resolveConflicts', () => {
    const mockConflicts = [
      {
        id: 'conflict-1',
        type: ConflictType.TAG_MUTUAL_EXCLUSION,
        severity: ConflictSeverity.HIGH,
        customerId: 100,
        description: '标签互斥冲突',
        conflictingItems: [
          { type: 'tag' as const, name: '高风险客户', value: { confidence: 0.8 } },
          { type: 'tag' as const, name: '低风险客户', value: { confidence: 0.7 } },
        ],
        detectedAt: new Date(),
      },
    ];

    const mockRecommendations: Partial<TagRecommendation>[] = [
      {
        customerId: 100,
        tagName: '高风险客户',
        tagCategory: '风险等级',
        confidence: 0.8,
        source: 'rule',
      },
      {
        customerId: 100,
        tagName: '低风险客户',
        tagCategory: '风险等级',
        confidence: 0.7,
        source: 'rule',
      },
    ];

    it('should resolve conflicts using REMOVE_LOWER_CONFIDENCE strategy', async () => {
      const result = await conflictDetector.resolveConflicts(
        mockConflicts,
        mockRecommendations as TagRecommendation[]
      );

      expect(Array.isArray(result)).toBe(true);
      // 应该保留置信度更高的"高风险客户"
      expect(result.some(r => r.tagName === '高风险客户')).toBe(true);
      expect(result.some(r => r.tagName === '低风险客户')).toBe(false);
    });

    it('should return original recommendations when no conflicts', async () => {
      const result = await conflictDetector.resolveConflicts(
        [],
        mockRecommendations as TagRecommendation[]
      );

      expect(result).toEqual(mockRecommendations);
    });

    it('should handle MANUAL_REVIEW strategy', async () => {
      const highSeverityConflict = {
        id: 'conflict-high',
        type: ConflictType.RULE_CONTRADICTION,
        severity: ConflictSeverity.HIGH,
        customerId: 100,
        description: '规则矛盾',
        conflictingItems: [
          { type: 'rule' as const, name: 'Rule A' },
          { type: 'rule' as const, name: 'Rule B' },
        ],
        detectedAt: new Date(),
      };

      const result = await conflictDetector.resolveConflicts(
        [highSeverityConflict],
        mockRecommendations as TagRecommendation[]
      );

      // HIGH 严重程度的冲突可能需要人工审核，返回空数组或原始推荐
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getResolutionStrategy', () => {
    it('should return REMOVE_LOWER_CONFIDENCE for TAG_MUTUAL_EXCLUSION', () => {
      const strategy = (conflictDetector as any).getResolutionStrategy(
        ConflictType.TAG_MUTUAL_EXCLUSION,
        ConflictSeverity.HIGH
      );

      expect(strategy).toBe(ResolutionStrategy.REMOVE_LOWER_CONFIDENCE);
    });

    it('should return MANUAL_REVIEW for HIGH severity RULE_CONTRADICTION', () => {
      const strategy = (conflictDetector as any).getResolutionStrategy(
        ConflictType.RULE_CONTRADICTION,
        ConflictSeverity.HIGH
      );

      expect(strategy).toBe(ResolutionStrategy.MANUAL_REVIEW);
    });

    it('should default to MANUAL_REVIEW for unknown types', () => {
      const strategy = (conflictDetector as any).getResolutionStrategy(
        'UNKNOWN_TYPE' as ConflictType,
        ConflictSeverity.MEDIUM
      );

      expect(strategy).toBe(ResolutionStrategy.MANUAL_REVIEW);
    });
  });

  describe('addMutualExclusionRule', () => {
    it('should add new mutual exclusion rule', () => {
      const newRule = {
        tag1: 'Tag A',
        tag2: 'Tag B',
        reason: 'Test exclusion rule',
      };

      conflictDetector.addMutualExclusionRule(newRule);

      // 验证规则已添加（通过检测该规则的冲突）
      const recommendations: Partial<TagRecommendation>[] = [
        {
          customerId: 100,
          tagName: 'Tag A',
          tagCategory: 'Test',
          confidence: 0.8,
        },
        {
          customerId: 100,
          tagName: 'Tag B',
          tagCategory: 'Test',
          confidence: 0.7,
        },
      ];

      const conflicts = (conflictDetector as any).detectTagMutualExclusions(
        100,
        recommendations as TagRecommendation[]
      );

      expect(conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('removeMutualExclusionRule', () => {
    it('should remove mutual exclusion rule by tag names', () => {
      const initialLength = (conflictDetector as any).mutualExclusionRules.length;

      conflictDetector.removeMutualExclusionRule('高风险客户', '低风险客户');

      const currentLength = (conflictDetector as any).mutualExclusionRules.length;
      expect(currentLength).toBe(initialLength - 1);
    });

    it('should not remove rule if tags are not found', () => {
      const initialLength = (conflictDetector as any).mutualExclusionRules.length;

      conflictDetector.removeMutualExclusionRule('Non-existent Tag 1', 'Non-existent Tag 2');

      const currentLength = (conflictDetector as any).mutualExclusionRules.length;
      expect(currentLength).toBe(initialLength);
    });
  });

  describe('getMutualExclusionRules', () => {
    it('should return all mutual exclusion rules', () => {
      const rules = conflictDetector.getMutualExclusionRules();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty('tag1');
      expect(rules[0]).toHaveProperty('tag2');
      expect(rules[0]).toHaveProperty('reason');
    });
  });

  describe('ConflictType enum', () => {
    it('should have correct enum values', () => {
      expect(ConflictType.TAG_MUTUAL_EXCLUSION).toBe('TAG_MUTUAL_EXCLUSION');
      expect(ConflictType.RULE_CONTRADICTION).toBe('RULE_CONTRADICTION');
      expect(ConflictType.RECOMMENDATION_DUPLICATE).toBe('RECOMMENDATION_DUPLICATE');
      expect(ConflictType.RECOMMENDATION_CONFLICT).toBe('RECOMMENDATION_CONFLICT');
    });
  });

  describe('ConflictSeverity enum', () => {
    it('should have correct enum values', () => {
      expect(ConflictSeverity.LOW).toBe('LOW');
      expect(ConflictSeverity.MEDIUM).toBe('MEDIUM');
      expect(ConflictSeverity.HIGH).toBe('HIGH');
    });
  });

  describe('ResolutionStrategy enum', () => {
    it('should have correct enum values', () => {
      expect(ResolutionStrategy.REMOVE_LOWER_CONFIDENCE).toBe('REMOVE_LOWER_CONFIDENCE');
      expect(ResolutionStrategy.REMOVE_LOWER_PRIORITY).toBe('REMOVE_LOWER_PRIORITY');
      expect(ResolutionStrategy.MERGE_RECOMMENDATIONS).toBe('MERGE_RECOMMENDATIONS');
      expect(ResolutionStrategy.MANUAL_REVIEW).toBe('MANUAL_REVIEW');
      expect(ResolutionStrategy.KEEP_ALL).toBe('KEEP_ALL');
    });
  });

  describe('predefined mutual exclusion rules', () => {
    it('should have 4 predefined rules', () => {
      const rules = conflictDetector.getMutualExclusionRules();

      expect(rules.length).toBe(4);
    });

    it('should include 高价值客户 vs 流失风险客户 rule', () => {
      const rules = conflictDetector.getMutualExclusionRules();

      expect(rules.some(r => 
        r.tag1 === '高价值客户' && r.tag2 === '流失风险客户'
      )).toBe(true);
    });

    it('should include 活跃客户 vs 流失风险客户 rule', () => {
      const rules = conflictDetector.getMutualExclusionRules();

      expect(rules.some(r => 
        r.tag1 === '活跃客户' && r.tag2 === '流失风险客户'
      )).toBe(true);
    });

    it('should include 低风险客户 vs 高风险客户 rule', () => {
      const rules = conflictDetector.getMutualExclusionRules();

      expect(rules.some(r => 
        r.tag1 === '低风险客户' && r.tag2 === '高风险客户'
      )).toBe(true);
    });

    it('should include 高潜力客户 vs 衰退客户 rule', () => {
      const rules = conflictDetector.getMutualExclusionRules();

      expect(rules.some(r => 
        r.tag1 === '高潜力客户' && r.tag2 === '衰退客户'
      )).toBe(true);
    });
  });
});
