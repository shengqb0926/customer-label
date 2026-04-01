import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationService, CreateRecommendationDto, RecommendOptions } from './recommendation.service';
import { TagRecommendation } from './entities/tag-recommendation.entity';
import { RecommendationRule } from './entities/recommendation-rule.entity';
import { ClusteringConfig } from './entities/clustering-config.entity';
import { Customer } from './entities/customer.entity';
import { CustomerTag } from './entities/customer-tag.entity';
import { CacheService } from '../../infrastructure/redis';
import { RuleEngineService } from './engines/rule-engine.service';
import { ClusteringEngineService } from './engines/clustering-engine.service';
import { AssociationEngineService } from './engines/association-engine.service';
import { FusionEngineService } from './engines/fusion-engine.service';
import { ConflictDetectorService } from './services/conflict-detector.service';
import { SimilarityService } from '../../common/similarity';
import { NotFoundException } from '@nestjs/common';
import { GetRecommendationsDto, RecommendationSource } from './dto/get-recommendations.dto';
import { RecommendationStatus as Status } from './entities/tag-recommendation.entity';

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
    insert: jest.fn(),
    findByIds: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
      getCount: jest.fn(),
    })),
  };

  const mockRuleRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getCount: jest.fn(),
    })),
  };

  const mockConfigRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCustomerRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCustomerTagRepo = {
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
    deleteByPattern: jest.fn(),
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

  const mockSimilarityService = {
    calculateSimilarity: jest.fn(),
    findSimilarCustomers: jest.fn(),
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
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepo,
        },
        {
          provide: getRepositoryToken(CustomerTag),
          useValue: mockCustomerTagRepo,
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
        {
          provide: SimilarityService,
          useValue: mockSimilarityService,
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
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomerData);
      mockRuleEngine.generateRecommendations.mockResolvedValue(mockRuleRecs);
      mockClusteringEngine.generateRecommendations.mockResolvedValue(mockClusterRecs);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue(mockFusedRecs);
      mockRecommendationRepo.insert.mockResolvedValue({ identifiers: [{ id: 1 }] });
      mockRecommendationRepo.findByIds.mockResolvedValue(mockFusedRecs as any);
      
      // Mock getCustomerTags 和 getAllCustomerTagsMap 为私有方法
      Object.defineProperty(recommendationService, 'getCustomerTags', {
        value: jest.fn().mockResolvedValue([]),
        writable: true,
      });
      Object.defineProperty(recommendationService, 'getAllCustomerTagsMap', {
        value: jest.fn().mockResolvedValue(new Map()),
        writable: true,
      });

      const result = await recommendationService.generateForCustomer(100, {}, mockCustomerData as any);

      expect(result).toBeDefined();
      expect(ruleEngine.generateRecommendations).toHaveBeenCalled();
      expect(clusteringEngine.generateRecommendations).toHaveBeenCalled();
      expect(associationEngine.generateRecommendations).toHaveBeenCalled();
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
      mockRecommendationRepo.insert.mockResolvedValue({ identifiers: [{ id: 1 }] });
      mockRecommendationRepo.findByIds.mockResolvedValue(mockRecs as any);

      const result = await (recommendationService as any).saveRecommendations(100, mockRecs);

      expect(result).toBeDefined();
      expect(mockRecommendationRepo.insert).toHaveBeenCalled();
    });

    it('should cache saved recommendations', async () => {
      mockRecommendationRepo.insert.mockResolvedValue({ identifiers: [{ id: 1 }] });
      mockRecommendationRepo.findByIds.mockResolvedValue(mockRecs as any);

      await (recommendationService as any).saveRecommendations(100, mockRecs);

      expect(cacheService.set).toHaveBeenCalledWith(
        `recommendations:100`,
        expect.any(Array),
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
      mockCustomerRepo.findOne.mockResolvedValue({ id: 100 } as any);
      mockRuleEngine.generateRecommendations.mockResolvedValue(mockRecs);
      mockClusteringEngine.generateRecommendations.mockResolvedValue([]);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue(mockRecs);
      
      const mockConflict = {
        type: 'TAG_MUTUAL_EXCLUSION',
        severity: 'HIGH' as const,
        description: '冲突',
        conflictingItems: [],
        detectedAt: new Date(),
      };
      
      mockConflictDetector.detectCustomerConflicts.mockResolvedValue([mockConflict]);
      mockConflictDetector.resolveConflicts.mockResolvedValue([mockRecs[0]]);
      mockRecommendationRepo.insert.mockResolvedValue({ identifiers: [{ id: 1 }] });
      mockRecommendationRepo.findByIds.mockResolvedValue([mockRecs[0]] as any);
      
      // Mock getCustomerTags 和 getAllCustomerTagsMap
      jest.spyOn(recommendationService as any, 'getCustomerTags').mockResolvedValue([]);
      jest.spyOn(recommendationService as any, 'getAllCustomerTagsMap').mockResolvedValue(new Map());

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
      mockCustomerRepo.findOne.mockResolvedValue({ id: 100 } as any);
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockClusteringEngine.generateRecommendations.mockResolvedValue([]);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);
      mockRecommendationRepo.insert.mockResolvedValue({ identifiers: [] });
      mockRecommendationRepo.findByIds.mockResolvedValue([]);
      
      // Mock getCustomerTags 和 getAllCustomerTagsMap
      jest.spyOn(recommendationService as any, 'getCustomerTags').mockResolvedValue([]);
      jest.spyOn(recommendationService as any, 'getAllCustomerTagsMap').mockResolvedValue(new Map());

      await recommendationService.generateForCustomer(100, {}, { id: 100 } as any);

      expect(ruleEngine.generateRecommendations).toHaveBeenCalled();
      expect(clusteringEngine.generateRecommendations).toHaveBeenCalled();
      expect(associationEngine.generateRecommendations).toHaveBeenCalled();
    });

    it('should enable cache by default', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCustomerRepo.findOne.mockResolvedValue({ id: 100 } as any);
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockClusteringEngine.generateRecommendations.mockResolvedValue([]);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);
      mockRecommendationRepo.insert.mockResolvedValue({ identifiers: [] });
      mockRecommendationRepo.findByIds.mockResolvedValue([]);
      
      // Mock getCustomerTags 和 getAllCustomerTagsMap
      jest.spyOn(recommendationService as any, 'getCustomerTags').mockResolvedValue([]);
      jest.spyOn(recommendationService as any, 'getAllCustomerTagsMap').mockResolvedValue(new Map());

      await recommendationService.generateForCustomer(100, {}, { id: 100 } as any);

      expect(cacheService.get).toHaveBeenCalledWith('recommendations:100');
    });

    it('should enable conflict detection by default', async () => {
      const mockRecs = [{
        customerId: 100,
        tagName: 'Test Tag',
        tagCategory: 'Test',
        confidence: 0.8,
        source: 'rule',
        reason: 'Test',
      }];
      
      mockCacheService.get.mockResolvedValue(null);
      mockCustomerRepo.findOne.mockResolvedValue({ id: 100 } as any);
      mockRuleEngine.generateRecommendations.mockResolvedValue(mockRecs);
      mockClusteringEngine.generateRecommendations.mockResolvedValue([]);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue(mockRecs);
      mockConflictDetector.detectCustomerConflicts.mockResolvedValue([]);
      mockRecommendationRepo.insert.mockResolvedValue({ identifiers: [{ id: 1 }] });
      mockRecommendationRepo.findByIds.mockResolvedValue(mockRecs as any);
      
      // Mock getCustomerTags 和 getAllCustomerTagsMap
      jest.spyOn(recommendationService as any, 'getCustomerTags').mockResolvedValue([]);
      jest.spyOn(recommendationService as any, 'getAllCustomerTagsMap').mockResolvedValue(new Map());

      await recommendationService.generateForCustomer(100, {}, { id: 100 } as any);

      // 当有推荐结果时，应该会检测冲突（即使没有检测到）
      expect(conflictDetector.detectCustomerConflicts).toHaveBeenCalled();
    });
  });

  describe('batchGenerate', () => {
    it('应该批量生成推荐', async () => {
      const customerIds = [1, 2, 3];
      mockCustomerRepo.findOne.mockResolvedValue({ id: 1 } as any);
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockClusteringEngine.generateRecommendations.mockResolvedValue([]);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);
      
      // Mock getCustomerTags 和 getAllCustomerTagsMap
      jest.spyOn(recommendationService as any, 'getCustomerTags').mockResolvedValue([]);
      jest.spyOn(recommendationService as any, 'getAllCustomerTagsMap').mockResolvedValue(new Map());

      const result = await recommendationService.batchGenerate(customerIds);

      expect(result).toBe(3);
      expect(mockRuleEngine.generateRecommendations).toHaveBeenCalledTimes(3);
    });

    it('应该处理批量生成中的部分失败', async () => {
      const customerIds = [1, 2, 3];
      
      // Mock generateForCustomer 在第二个客户上失败
      jest.spyOn(recommendationService, 'generateForCustomer')
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('Customer not found'))
        .mockResolvedValueOnce([]);

      const result = await recommendationService.batchGenerate(customerIds);

      expect(result).toBe(2); // 只有 2 个成功
    });
  });

  describe('getRealCustomerData', () => {
    it('应该从数据库获取真实客户数据', async () => {
      const mockCustomer = {
        id: 1,
        totalAssets: 1500000,
        monthlyIncome: 60000,
        annualSpend: 120000,
        lastLoginDays: 5,
        registerDays: 365,
        orderCount: 15,
        productCount: 5,
        riskLevel: 'LOW',
        age: 35,
        gender: 'M',
        city: '北京',
        level: 'GOLD',
      };
      
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);

      const result = await (recommendationService as any).getRealCustomerData(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.totalAssets).toBe(1500000);
      expect(result.monthlyIncome).toBe(60000);
    });

    it('应该处理客户不存在的情况', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);

      await expect((recommendationService as any).getRealCustomerData(999))
        .rejects.toThrow(NotFoundException);
    });

    it('应该处理 null 值并转换为 0', async () => {
      const mockCustomer = {
        id: 1,
        totalAssets: null,
        monthlyIncome: undefined,
        annualSpend: NaN,
      };
      
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer as any);

      const result = await (recommendationService as any).getRealCustomerData(1);

      expect(result.totalAssets).toBe(0);
      expect(result.monthlyIncome).toBe(0);
    });
  });

  describe('getCustomerTags', () => {
    it('应该获取客户标签列表', async () => {
      const mockTags = [
        { id: 1, customerId: 1, tagName: '高价值客户' },
        { id: 2, customerId: 1, tagName: '活跃客户' },
      ];
      
      mockCustomerTagRepo.find.mockResolvedValue(mockTags);

      const result = await (recommendationService as any).getCustomerTags(1);

      expect(result).toEqual(mockTags);
      expect(mockCustomerTagRepo.find).toHaveBeenCalledWith({
        where: { customerId: 1 },
        order: { createdAt: 'DESC' },
      });
    });

    it('应该返回空数组当客户没有标签', async () => {
      mockCustomerTagRepo.find.mockResolvedValue([]);

      const result = await (recommendationService as any).getCustomerTags(999);

      expect(result).toEqual([]);
    });
  });

  describe('getAllCustomerTagsMap', () => {
    it('应该获取所有客户的标签映射', async () => {
      const mockTags = [
        { customerId: 1, tagName: '标签 1' },
        { customerId: 1, tagName: '标签 2' },
        { customerId: 2, tagName: '标签 3' },
      ];
      
      mockCustomerTagRepo.find.mockResolvedValue(mockTags);

      const result = await (recommendationService as any).getAllCustomerTagsMap();

      expect(result).toBeInstanceOf(Map);
      expect(result.get(1)).toEqual(['标签 1', '标签 2']);
      expect(result.get(2)).toEqual(['标签 3']);
    });

    it('应该返回空 Map 当没有数据', async () => {
      mockCustomerTagRepo.find.mockResolvedValue([]);

      const result = await (recommendationService as any).getAllCustomerTagsMap();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe('extractFeaturesWithStats', () => {
    it('应该提取特征向量并计算统计信息', async () => {
      const customers = [
        { id: 1, totalAssets: 1000000, monthlyIncome: 50000, age: 30 },
        { id: 2, totalAssets: 2000000, monthlyIncome: 80000, age: 40 },
      ];

      const result = await recommendationService.extractFeaturesWithStats(customers as any);

      expect(result.vectors).toHaveLength(2);
      expect(result.stats).toHaveLength(8); // 8 个特征维度
      expect(result.stats[0]).toHaveProperty('min');
      expect(result.stats[0]).toHaveProperty('max');
      expect(result.stats[0]).toHaveProperty('mean');
    });

    it('应该处理空数组', async () => {
      const result = await recommendationService.extractFeaturesWithStats([]);

      expect(result.vectors).toEqual([]);
      expect(result.stats).toEqual([]);
    });

    it('应该处理单个客户', async () => {
      const customers = [{ id: 1, totalAssets: 1000000 }];

      const result = await recommendationService.extractFeaturesWithStats(customers as any);

      expect(result.vectors).toHaveLength(1);
      // 当只有一个客户时，min === max，归一化结果应为 0
      expect(result.vectors[0].features[0]).toBe(0);
    });
  });

  describe('findByCustomerWithPagination', () => {
    const mockQueryResult = {
      data: [{ id: 1, tagName: '标签 1', confidence: 0.9 }],
      total: 1,
      page: 1,
      limit: 20,
    };

    it('应该分页查询客户推荐', async () => {
      const options = { page: 1, limit: 20 };
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockQueryResult.data, mockQueryResult.total]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await recommendationService.findByCustomerWithPagination(1, options);

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockQueryResult.data);
      expect(result.total).toBe(1);
    });

    it('应该支持按分类筛选', async () => {
      const options = { category: '客户价值' };
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await recommendationService.findByCustomerWithPagination(1, options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rec.tagCategory = :category',
        { category: '客户价值' }
      );
    });

    it('应该支持按来源筛选', async () => {
      const options: GetRecommendationsDto = { source: RecommendationSource.RULE };
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await recommendationService.findByCustomerWithPagination(1, options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rec.source = :source',
        { source: RecommendationSource.RULE }
      );
    });

    it('应该支持按置信度筛选', async () => {
      const options = { minConfidence: 0.8 };
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await recommendationService.findByCustomerWithPagination(1, options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rec.confidence >= :minConfidence',
        { minConfidence: 0.8 }
      );
    });

    it('应该支持按状态筛选', async () => {
      const options = { isAccepted: true };
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await recommendationService.findByCustomerWithPagination(1, options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rec.isAccepted = :isAccepted',
        { isAccepted: true }
      );
    });

    it('应该支持日期范围筛选', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      const options: GetRecommendationsDto = { startDate, endDate };
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await recommendationService.findByCustomerWithPagination(1, options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rec.createdAt BETWEEN :startDate AND :endDate',
        { startDate, endDate }
      );
    });

    it('应该支持客户名称模糊查询', async () => {
      const options = { customerName: '张三' };
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await recommendationService.findByCustomerWithPagination(1, options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rec.customer_id::text ILIKE :customerName',
        { customerName: '%张三%' }
      );
    });

    it('应该支持排序', async () => {
      const options: GetRecommendationsDto = { sortBy: 'confidence' as any, sortOrder: 'desc' };
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await recommendationService.findByCustomerWithPagination(1, options);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('rec.confidence', 'DESC');
    });
  });

  describe('findAllWithPagination', () => {
    it('应该查询所有客户的推荐（分页）', async () => {
      const options = { page: 1, limit: 20 };
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await recommendationService.findAllWithPagination(options);

      expect(result).toBeDefined();
    });

    it('应该支持 status 筛选', async () => {
      const options: GetRecommendationsDto = { status: Status.PENDING };
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await recommendationService.findAllWithPagination(options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rec.status = :status',
        { status: Status.PENDING }
      );
    });
  });

  describe('findByCustomer', () => {
    it('应该获取客户的推荐列表（旧版）', async () => {
      const mockRecs = [
        { id: 1, tagName: '标签 1', confidence: 0.9 },
        { id: 2, tagName: '标签 2', confidence: 0.8 },
      ];
      
      mockRecommendationRepo.find.mockResolvedValue(mockRecs);

      const result = await recommendationService.findByCustomer(1);

      expect(result).toEqual(mockRecs);
      expect(mockRecommendationRepo.find).toHaveBeenCalledWith({
        where: { customerId: 1 },
        order: { confidence: 'DESC', createdAt: 'DESC' },
        take: 20,
      });
    });
  });

  describe('getStats', () => {
    it('应该获取推荐统计信息', async () => {
      mockRecommendationRepo.count.mockResolvedValue(100);
      
      const mockBySourceResult = [
        { source: 'rule', count: '60' },
        { source: 'clustering', count: '30' },
        { source: 'association', count: '10' },
      ];
      
      const mockAvgResult = { avg: '0.85' };
      
      const queryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockBySourceResult),
      };
      
      const avgQueryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockAvgResult),
      };
      
      mockRecommendationRepo.createQueryBuilder
        .mockReturnValueOnce(queryBuilderMock as any)
        .mockReturnValueOnce(avgQueryBuilderMock as any);

      const result = await recommendationService.getStats();

      expect(result).toEqual({
        total: 100,
        bySource: {
          rule: 60,
          clustering: 30,
          association: 10,
        },
        avgConfidence: 0.85,
      });
    });

    it('应该处理空统计数据', async () => {
      mockRecommendationRepo.count.mockResolvedValue(0);
      
      const queryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      
      const avgQueryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: null }),
      };
      
      mockRecommendationRepo.createQueryBuilder
        .mockReturnValueOnce(queryBuilderMock as any)
        .mockReturnValueOnce(avgQueryBuilderMock as any);

      const result = await recommendationService.getStats();

      expect(result).toEqual({
        total: 0,
        bySource: {},
        avgConfidence: 0,
      });
    });

  });

  describe('getStatusStats', () => {
    it('应该按状态统计推荐数量', async () => {
      const mockResults = [
        { status: 'pending', count: '50' },
        { status: 'accepted', count: '30' },
        { status: 'rejected', count: '20' },
      ];
      
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockResults),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(queryBuilderMock as any);

      const result = await recommendationService.getStatusStats();

      expect(result).toEqual({
        total: 100,
        pending: 50,
        accepted: 30,
        rejected: 20,
      });
    });

    it('应该支持筛选条件', async () => {
      const options: GetRecommendationsDto = {
        category: '客户价值',
        source: RecommendationSource.RULE,
        minConfidence: 0.8,
      };
      
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(queryBuilderMock as any);

      await recommendationService.getStatusStats(options);

      expect(queryBuilderMock.andWhere).toHaveBeenCalled();
    });

    it('应该支持客户名称筛选', async () => {
      const options = { customerName: '张三' };
      
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      
      mockRecommendationRepo.createQueryBuilder.mockReturnValue(queryBuilderMock as any);

      await recommendationService.getStatusStats(options);

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'rec.customer_id::text ILIKE :customerName',
        { customerName: '%张三%' }
      );
    });
  });

  describe('invalidateCache', () => {
    it('应该清除客户推荐缓存', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);
      mockCacheService.deleteByPattern.mockResolvedValue(undefined);

      await recommendationService.invalidateCache(1);

      expect(mockCacheService.delete).toHaveBeenCalledWith('recommendations:1');
    });

    it('应该清除相关缓存', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);
      mockCacheService.deleteByPattern.mockResolvedValue(undefined);

      await recommendationService.invalidateCache(1);

      expect(mockCacheService.deleteByPattern).toHaveBeenCalledWith(
        expect.stringContaining('rec:similar:1:')
      );
      expect(mockCacheService.deleteByPattern).toHaveBeenCalledWith(
        expect.stringContaining('rec:stats:1:')
      );
    });

    it('应该处理缓存清除失败', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);
      mockCacheService.deleteByPattern.mockRejectedValue(new Error('Redis error'));

      await expect(recommendationService.invalidateCache(1)).resolves.not.toThrow();
    });
  });

  describe('acceptRecommendation', () => {
    it('应该接受推荐', async () => {
      const mockRec = {
        id: 1,
        customerId: 100,
        tagName: '高价值客户',
        status: 'pending',
      };
      
      mockRecommendationRepo.findOne.mockResolvedValue(mockRec as any);
      mockRecommendationRepo.save.mockResolvedValue({ ...mockRec, status: 'accepted' });
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await recommendationService.acceptRecommendation(1, 1);

      expect(result.status).toBe('accepted');
      expect(mockRecommendationRepo.save).toHaveBeenCalled();
      expect(mockCacheService.delete).toHaveBeenCalledWith('recommendations:100');
    });

    it('应该支持修改标签名', async () => {
      const mockRec = { id: 1, customerId: 100, tagName: '原标签' };
      
      mockRecommendationRepo.findOne.mockResolvedValue(mockRec as any);
      mockRecommendationRepo.save.mockResolvedValue({ 
        ...mockRec, 
        status: 'accepted',
        modifiedTagName: '新标签名',
      });

      const result = await recommendationService.acceptRecommendation(1, 1, '新标签名');

      expect(result.modifiedTagName).toBe('新标签名');
    });

    it('应该处理推荐不存在', async () => {
      mockRecommendationRepo.findOne.mockResolvedValue(null);

      await expect(recommendationService.acceptRecommendation(999, 1))
        .rejects.toThrow('推荐记录不存在');
    });
  });

  describe('rejectRecommendation', () => {
    it('应该拒绝推荐', async () => {
      const mockRec = { id: 1, customerId: 100, status: 'pending' };
      
      mockRecommendationRepo.findOne.mockResolvedValue(mockRec as any);
      mockRecommendationRepo.save.mockResolvedValue({ ...mockRec, status: 'rejected' });
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await recommendationService.rejectRecommendation(1, 1);

      expect(result.status).toBe('rejected');
    });

    it('应该支持反馈原因', async () => {
      const mockRec = { id: 1, customerId: 100 };
      
      mockRecommendationRepo.findOne.mockResolvedValue(mockRec as any);
      mockRecommendationRepo.save.mockResolvedValue({ 
        ...mockRec, 
        status: 'rejected',
        feedbackReason: '标签不准确',
      });

      const result = await recommendationService.rejectRecommendation(1, 1, '标签不准确');

      expect(result.feedbackReason).toBe('标签不准确');
    });
  });

  describe('batchAcceptRecommendations', () => {
    it('应该批量接受推荐', async () => {
      const ids = [1, 2, 3];
      
      mockRecommendationRepo.findOne
        .mockResolvedValueOnce({ id: 1, customerId: 100 })
        .mockResolvedValueOnce({ id: 2, customerId: 100 })
        .mockResolvedValueOnce({ id: 3, customerId: 100 });
      
      mockRecommendationRepo.save.mockResolvedValue({ status: 'accepted' });
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await recommendationService.batchAcceptRecommendations(ids, 1);

      expect(result).toBe(3);
    });

    it('应该支持自动打标签', async () => {
      const ids = [1];
      
      mockRecommendationRepo.findOne.mockResolvedValue({ 
        id: 1, 
        customerId: 100,
        tagName: '高价值客户',
      });
      mockRecommendationRepo.save.mockResolvedValue({ status: 'accepted' });
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await recommendationService.batchAcceptRecommendations(ids, 1, true);

      expect(result).toBe(1);
    });

    it('应该处理部分失败', async () => {
      const ids = [1, 2, 3];
      
      mockRecommendationRepo.findOne
        .mockResolvedValueOnce({ id: 1, customerId: 100 })
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({ id: 3, customerId: 100 });
      
      mockRecommendationRepo.save.mockResolvedValue({ status: 'accepted' });
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await recommendationService.batchAcceptRecommendations(ids, 1);

      expect(result).toBe(2); // 只有 2 个成功
    });
  });

  describe('batchRejectRecommendations', () => {
    it('应该批量拒绝推荐', async () => {
      const ids = [1, 2, 3];
      
      mockRecommendationRepo.findOne
        .mockResolvedValueOnce({ id: 1, customerId: 100 })
        .mockResolvedValueOnce({ id: 2, customerId: 100 })
        .mockResolvedValueOnce({ id: 3, customerId: 100 });
      
      mockRecommendationRepo.save.mockResolvedValue({ status: 'rejected' });
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await recommendationService.batchRejectRecommendations(ids, 1, '不需要');

      expect(result).toBe(3);
    });
  });

  describe('undoRecommendation', () => {
    it('应该撤销推荐操作', async () => {
      const mockRec = {
        id: 1,
        customerId: 100,
        status: 'accepted',
        isAccepted: true,
        acceptedAt: new Date(),
        acceptedBy: 1,
        modifiedTagName: '修改名',
        feedbackReason: '原因',
      };
      
      mockRecommendationRepo.findOne.mockResolvedValue(mockRec as any);
      mockRecommendationRepo.save.mockResolvedValue({
        ...mockRec,
        isAccepted: null,
        acceptedAt: null,
        acceptedBy: null,
        modifiedTagName: null,
        feedbackReason: null,
      });
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await recommendationService.undoRecommendation(1, 1);

      expect(result.isAccepted).toBeNull();
      expect(result.acceptedAt).toBeNull();
    });

    it('应该处理推荐不存在', async () => {
      mockRecommendationRepo.findOne.mockResolvedValue(null);

      await expect(recommendationService.undoRecommendation(999))
        .rejects.toThrow('推荐 999 不存在');
    });
  });

  describe('batchUndoRecommendations', () => {
    it('应该批量撤销推荐', async () => {
      const ids = [1, 2, 3];
      
      mockRecommendationRepo.findOne
        .mockResolvedValueOnce({ id: 1, customerId: 100 })
        .mockResolvedValueOnce({ id: 2, customerId: 100 })
        .mockResolvedValueOnce({ id: 3, customerId: 100 });
      
      mockRecommendationRepo.save.mockResolvedValue({ isAccepted: null });
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await recommendationService.batchUndoRecommendations(ids, 1);

      expect(result).toBe(3);
    });
  });

  describe('getRecommendationById', () => {
    it('应该获取单个推荐详情', async () => {
      const mockRec = {
        id: 1,
        tagName: '高价值客户',
        confidence: 0.9,
      };
      
      mockRecommendationRepo.findOne.mockResolvedValue(mockRec as any);

      const result = await recommendationService.getRecommendationById(1);

      expect(result).toEqual(mockRec);
    });

    it('应该返回 null 当推荐不存在', async () => {
      mockRecommendationRepo.findOne.mockResolvedValue(null);

      const result = await recommendationService.getRecommendationById(999);

      expect(result).toBeNull();
    });
  });

  describe('getSimilarCustomerRecommendations', () => {
    it('应该获取相似客户推荐', async () => {
      const mockTags = [{ customerId: 1, tag: { name: '标签 1' } }];
      const mockSimilarityResults = {
        results: [
          {
            customerId: 2,
            similarity: 0.85,
          },
        ],
      };
      
      mockCustomerTagRepo.find.mockResolvedValue(mockTags as any);
      mockSimilarityService.findSimilarCustomers.mockResolvedValue(mockSimilarityResults);

      const result = await recommendationService.getSimilarCustomerRecommendations(1, '标签 1', 5);

      expect(result).toHaveLength(1);
      expect(result[0].customerId).toBe(2);
      expect(result[0].similarityScore).toBe(0.85);
    });

    it('应该返回空数组当客户没有标签', async () => {
      mockCustomerTagRepo.find.mockResolvedValue([]);

      const result = await recommendationService.getSimilarCustomerRecommendations(1, '标签 1', 5);

      expect(result).toEqual([]);
    });

    it('应该处理错误', async () => {
      mockCustomerTagRepo.find.mockRejectedValue(new Error('Database error'));

      const result = await recommendationService.getSimilarCustomerRecommendations(1, '标签 1', 5);

      expect(result).toEqual([]);
    });
  });

  describe('getCustomerRecommendationHistory', () => {
    it('应该获取客户的历史推荐记录', async () => {
      const mockHistory = [
        {
          id: 1,
          tagName: '标签 1',
          tagCategory: '分类 1',
          createdAt: new Date(),
          status: 'accepted',
          reason: '原因',
          acceptedAt: new Date(),
        },
        {
          id: 2,
          tagName: '标签 2',
          tagCategory: '分类 2',
          createdAt: new Date(),
          status: 'pending',
          reason: '原因',
        },
      ];
      
      mockRecommendationRepo.find.mockResolvedValue(mockHistory);

      const result = await recommendationService.getCustomerRecommendationHistory(1, 10);

      expect(result).toHaveLength(2);
      expect(result[0].tagName).toBe('标签 1');
      expect(result[0].status).toBe('accepted');
    });

    it('应该处理空历史记录', async () => {
      mockRecommendationRepo.find.mockResolvedValue([]);

      const result = await recommendationService.getCustomerRecommendationHistory(1, 10);

      expect(result).toEqual([]);
    });

    it('应该处理错误', async () => {
      mockRecommendationRepo.find.mockRejectedValue(new Error('Database error'));

      const result = await recommendationService.getCustomerRecommendationHistory(1, 10);

      expect(result).toEqual([]);
    });
  });

  describe('edge cases and error handling', () => {
    it('应该处理融合引擎失败', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCustomerRepo.findOne.mockResolvedValue({ id: 1 } as any);
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockClusteringEngine.generateRecommendations.mockResolvedValue([]);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockRejectedValue(new Error('Fusion failed'));
      
      jest.spyOn(recommendationService as any, 'getCustomerTags').mockResolvedValue([]);
      jest.spyOn(recommendationService as any, 'getAllCustomerTagsMap').mockResolvedValue(new Map());

      const result = await recommendationService.generateForCustomer(1, {}, { id: 1 } as any);

      expect(result).toEqual([]);
    });

    it('应该处理冲突解决失败', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCustomerRepo.findOne.mockResolvedValue({ id: 1 } as any);
      mockRuleEngine.generateRecommendations.mockResolvedValue([{
        customerId: 1,
        tagName: '标签 1',
        tagCategory: '分类',
        confidence: 0.9,
        source: 'rule',
        reason: '原因',
      }]);
      mockClusteringEngine.generateRecommendations.mockResolvedValue([]);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([{
        customerId: 1,
        tagName: '标签 1',
        tagCategory: '分类',
        confidence: 0.9,
        source: 'rule',
        reason: '原因',
      }]);
      
      mockConflictDetector.detectCustomerConflicts.mockResolvedValue([{
        type: 'TAG_MUTUAL_EXCLUSION',
        severity: 'HIGH',
        description: '冲突',
        conflictingItems: [],
        detectedAt: new Date(),
      }]);
      
      mockConflictDetector.resolveConflicts.mockRejectedValue(new Error('Resolution failed'));
      
      jest.spyOn(recommendationService as any, 'getCustomerTags').mockResolvedValue([]);
      jest.spyOn(recommendationService as any, 'getAllCustomerTagsMap').mockResolvedValue(new Map());

      const result = await recommendationService.generateForCustomer(1, { detectConflicts: true }, { id: 1 } as any);

      expect(result).toEqual([]);
    });
  });
});
