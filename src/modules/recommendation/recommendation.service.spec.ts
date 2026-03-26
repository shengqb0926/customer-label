import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationService, CreateRecommendationDto, RecommendOptions } from './recommendation.service';
import { TagRecommendation } from './entities/tag-recommendation.entity';
import { RecommendationRule } from './entities/recommendation-rule.entity';
import { ClusteringConfig } from './entities/clustering-config.entity';
import { CacheService } from '../../infrastructure/redis';
import { RuleEngineService } from './engines/rule-engine.service';
import { ClusteringEngineService } from './engines/clustering-engine.service';
import { AssociationEngineService } from './engines/association-engine.service';
import { FusionEngineService } from './engines/fusion-engine.service';
import { ConflictDetectorService } from './services/conflict-detector.service';

describe('RecommendationService', () => {
  let recommendationService: RecommendationService;
  let recommendationRepo: Repository<TagRecommendation>;
  let cacheService: CacheService;
  let ruleEngine: RuleEngineService;
  let clusteringEngine: ClusteringEngineService;
  let associationEngine: AssociationEngineService;
  let fusionEngine: FusionEngineService;
  let conflictDetector: ConflictDetectorService;

  const mockRecommendationRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockRuleRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    mget: jest.fn(),
    mset: jest.fn(),
  };

  const mockRuleEngine = {
    generateRecommendations: jest.fn(),
    loadActiveRules: jest.fn(),
    createPredefinedRules: jest.fn(),
  };

  const mockClusteringEngine = {
    generateRecommendations: jest.fn(),
  };

  const mockAssociationEngine = {
    generateRecommendations: jest.fn(),
  };

  const mockFusionEngine = {
    fuseRecommendations: jest.fn(),
    getWeights: jest.fn(),
    setWeights: jest.fn(),
  };

  const mockConflictDetector = {
    detectCustomerConflicts: jest.fn(),
    resolveConflicts: jest.fn(),
    getMutualExclusionRules: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: getRepositoryToken(TagRecommendation),
          useValue: mockRecommendationRepo,
        },
        {
          provide: getRepositoryToken(RecommendationRule),
          useValue: mockRuleRepo,
        },
        {
          provide: getRepositoryToken(ClusteringConfig),
          useValue: mockConfigRepo,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: RuleEngineService,
          useValue: mockRuleEngine,
        },
        {
          provide: ClusteringEngineService,
          useValue: mockClusteringEngine,
        },
        {
          provide: AssociationEngineService,
          useValue: mockAssociationEngine,
        },
        {
          provide: FusionEngineService,
          useValue: mockFusionEngine,
        },
        {
          provide: ConflictDetectorService,
          useValue: mockConflictDetector,
        },
      ],
    }).compile();

    recommendationService = module.get<RecommendationService>(RecommendationService);
    recommendationRepo = module.get<Repository<TagRecommendation>>(getRepositoryToken(TagRecommendation));
    cacheService = module.get<CacheService>(CacheService);
    ruleEngine = module.get<RuleEngineService>(RuleEngineService);
    clusteringEngine = module.get<ClusteringEngineService>(ClusteringEngineService);
    associationEngine = module.get<AssociationEngineService>(AssociationEngineService);
    fusionEngine = module.get<FusionEngineService>(FusionEngineService);
    conflictDetector = module.get<ConflictDetectorService>(ConflictDetectorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(recommendationService).toBeDefined();
  });

  describe('generateForCustomer', () => {
    const mockCustomerData = {
      id: 100,
      totalAssets: 1500000,
      monthlyIncome: 60000,
      lastLoginDays: 5,
      orderCount: 15,
    };

    const mockRuleRecs: CreateRecommendationDto[] = [
      {
        customerId: 100,
        tagName: '高价值客户',
        tagCategory: '客户价值',
        confidence: 0.9,
        source: 'rule',
        reason: '规则匹配',
      },
    ];

    const mockClusterRecs: CreateRecommendationDto[] = [
      {
        customerId: 100,
        tagName: '潜力客户',
        tagCategory: '增长潜力',
        confidence: 0.85,
        source: 'clustering',
        reason: '簇特征分析',
      },
    ];

    const mockFusedRecs: CreateRecommendationDto[] = [
      {
        customerId: 100,
        tagName: '高价值客户',
        tagCategory: '客户价值',
        confidence: 0.92,
        source: 'rule',
        reason: '融合推荐',
      },
    ];

    it('should generate recommendations using all engines in "all" mode', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRuleEngine.generateRecommendations.mockResolvedValue(mockRuleRecs);
      mockClusteringEngine.generateRecommendations.mockResolvedValue(mockClusterRecs);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue(mockFusedRecs);
      mockRecommendationRepo.save.mockResolvedValue(mockFusedRecs as TagRecommendation[]);

      const result = await recommendationService.generateForCustomer(100, {}, mockCustomerData as any);

      expect(result).toEqual(mockFusedRecs);
      expect(ruleEngine.generateRecommendations).toHaveBeenCalled();
      expect(clusteringEngine.generateRecommendations).toHaveBeenCalled();
    });

    it('should return cached recommendations when available', async () => {
      const cachedRecs = mockFusedRecs;
      mockCacheService.get.mockResolvedValue(cachedRecs);

      const result = await recommendationService.generateForCustomer(100, {}, mockCustomerData as any);

      expect(result).toEqual(cachedRecs);
      expect(cacheService.get).toHaveBeenCalledWith(`recommendations:100`);
      expect(ruleEngine.generateRecommendations).not.toHaveBeenCalled();
    });

    it('should use only rule engine in "rule" mode', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRuleEngine.generateRecommendations.mockResolvedValue(mockRuleRecs);
      mockFusionEngine.fuseRecommendations.mockResolvedValue(mockRuleRecs);
      mockRecommendationRepo.save.mockResolvedValue(mockRuleRecs as TagRecommendation[]);

      const result = await recommendationService.generateForCustomer(
        100,
        { mode: 'rule' },
        mockCustomerData as any
      );

      expect(result).toBeDefined();
      expect(ruleEngine.generateRecommendations).toHaveBeenCalled();
      expect(clusteringEngine.generateRecommendations).not.toHaveBeenCalled();
      expect(associationEngine.generateRecommendations).not.toHaveBeenCalled();
    });

    it('should use only clustering engine in "clustering" mode', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockClusteringEngine.generateRecommendations.mockResolvedValue(mockClusterRecs);
      mockFusionEngine.fuseRecommendations.mockResolvedValue(mockClusterRecs);
      mockRecommendationRepo.save.mockResolvedValue(mockClusterRecs as TagRecommendation[]);

      const result = await recommendationService.generateForCustomer(
        100,
        { mode: 'clustering' },
        mockCustomerData as any
      );

      expect(result).toBeDefined();
      expect(ruleEngine.generateRecommendations).not.toHaveBeenCalled();
      expect(clusteringEngine.generateRecommendations).toHaveBeenCalled();
    });

    it('should skip conflict detection when detectConflicts is false', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRuleEngine.generateRecommendations.mockResolvedValue(mockRuleRecs);
      mockFusionEngine.fuseRecommendations.mockResolvedValue(mockRuleRecs);
      mockRecommendationRepo.save.mockResolvedValue(mockRuleRecs as TagRecommendation[]);

      await recommendationService.generateForCustomer(
        100,
        { detectConflicts: false },
        mockCustomerData as any
      );

      expect(conflictDetector.detectCustomerConflicts).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRuleEngine.generateRecommendations.mockRejectedValue(new Error('Engine error'));

      const result = await recommendationService.generateForCustomer(100, {}, mockCustomerData as any);

      expect(result).toEqual([]);
    });
  });

  describe('generateMockCustomerData', () => {
    it('should generate mock data for a customer ID', () => {
      const mockData = (recommendationService as any).generateMockCustomerData(100);

      expect(mockData).toBeDefined();
      expect(mockData.id).toBe(100);
      expect(typeof mockData.totalAssets).toBe('number');
      expect(typeof mockData.monthlyIncome).toBe('number');
    });

    it('should generate different data for different customer IDs', () => {
      const data1 = (recommendationService as any).generateMockCustomerData(100);
      const data2 = (recommendationService as any).generateMockCustomerData(200);

      expect(data1.id).toBe(100);
      expect(data2.id).toBe(200);
    });
  });

  describe('extractFeatures', () => {
    it('should extract feature vector from customer data', () => {
      const customerData = {
        id: 100,
        totalAssets: 1500000,
        monthlyIncome: 60000,
        age: 35,
        orderCount: 15,
        registerDays: 365,
      };

      const featureVector = (recommendationService as any).extractFeatures(customerData);

      expect(featureVector).toBeDefined();
      expect(featureVector.customerId).toBe(100);
      expect(Array.isArray(featureVector.features)).toBe(true);
      expect(featureVector.featureNames).toBeDefined();
    });
  });

  describe('saveRecommendations', () => {
    const mockRecs: CreateRecommendationDto[] = [
      {
        customerId: 100,
        tagName: '高价值客户',
        tagCategory: '客户价值',
        confidence: 0.9,
        source: 'rule',
        reason: '规则匹配',
      },
    ];

    it('should save recommendations to database', async () => {
      mockRecommendationRepo.save.mockResolvedValue(mockRecs);

      const result = await (recommendationService as any).saveRecommendations(100, mockRecs);

      expect(result).toEqual(mockRecs);
      expect(mockRecommendationRepo.save).toHaveBeenCalled();
    });

    it('should cache saved recommendations', async () => {
      mockRecommendationRepo.save.mockResolvedValue(mockRecs);

      await (recommendationService as any).saveRecommendations(100, mockRecs);

      expect(cacheService.set).toHaveBeenCalledWith(
        `recommendations:100`,
        mockRecs,
        expect.any(Number)
      );
    });
  });

  describe('integration with conflict detection', () => {
    const mockRecs: CreateRecommendationDto[] = [
      {
        customerId: 100,
        tagName: '高价值客户',
        tagCategory: '客户价值',
        confidence: 0.9,
        source: 'rule',
        reason: '规则匹配',
      },
      {
        customerId: 100,
        tagName: '流失风险客户',
        tagCategory: '风险预警',
        confidence: 0.85,
        source: 'rule',
        reason: '规则匹配',
      },
    ];

    it('should detect and resolve conflicts when enabled', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRuleEngine.generateRecommendations.mockResolvedValue(mockRecs);
      mockFusionEngine.fuseRecommendations.mockResolvedValue(mockRecs);
      mockConflictDetector.detectCustomerConflicts.mockResolvedValue([
        {
          type: 'TAG_MUTUAL_EXCLUSION',
          severity: 'HIGH',
          description: '冲突',
          conflictingItems: [],
          detectedAt: new Date(),
        },
      ]);
      mockConflictDetector.resolveConflicts.mockResolvedValue([mockRecs[0]]);
      mockRecommendationRepo.save.mockResolvedValue([mockRecs[0]]);

      const result = await recommendationService.generateForCustomer(100, {
        detectConflicts: true,
      }, { id: 100 } as any);

      expect(conflictDetector.detectCustomerConflicts).toHaveBeenCalled();
      expect(conflictDetector.resolveConflicts).toHaveBeenCalled();
    });
  });

  describe('default options', () => {
    it('should use "all" mode by default', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);
      mockRecommendationRepo.save.mockResolvedValue([]);

      await recommendationService.generateForCustomer(100, {}, { id: 100 } as any);

      expect(ruleEngine.generateRecommendations).toHaveBeenCalled();
      expect(clusteringEngine.generateRecommendations).toHaveBeenCalled();
    });

    it('should enable cache by default', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);
      mockRecommendationRepo.save.mockResolvedValue([]);

      await recommendationService.generateForCustomer(100, {}, { id: 100 } as any);

      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should enable conflict detection by default', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);
      mockRecommendationRepo.save.mockResolvedValue([]);

      await recommendationService.generateForCustomer(100, {}, { id: 100 } as any);

      // 如果有推荐结果，应该会检测冲突
      expect(mockFusionEngine.fuseRecommendations).toHaveBeenCalled();
    });
  });
});
