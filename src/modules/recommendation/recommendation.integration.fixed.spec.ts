import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationService } from './recommendation.service';
import { TagRecommendation, RecommendationStatus } from './entities/tag-recommendation.entity';
import { RecommendationRule } from './entities/recommendation-rule.entity';
import { ClusteringConfig } from './entities/clustering-config.entity';
import { Customer, CustomerLevel, RiskLevel, Gender } from './entities/customer.entity';
import { CustomerTag } from './entities/customer-tag.entity';
import { CacheService } from '../../infrastructure/redis';
import { RuleEngineService } from './engines/rule-engine.service';
import { ClusteringEngineService } from './engines/clustering-engine.service';
import { AssociationEngineService } from './engines/association-engine.service';
import { FusionEngineService } from './engines/fusion-engine.service';
import { ConflictDetectorService } from './services/conflict-detector.service';

/**
 * 推荐系统集成测试 - 简化稳定版
 * 专注于核心业务场景，避免过度复杂的 mock
 */
describe('RecommendationService Integration Tests - Simplified', () => {
  let service: RecommendationService;

  // Mock Repositories - 添加所有缺失的 repository
  const mockRecommendationRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findByIds: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
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
    exists: jest.fn(),
  };

  const mockRuleEngine = {
    generateRecommendations: jest.fn(),
  };

  const mockClusteringEngine = {
    generateRecommendations: jest.fn(),
  };

  const mockAssociationEngine = {
    generateRecommendations: jest.fn(),
  };

  const mockFusionEngine = {
    fuseRecommendations: jest.fn(),
  };

  const mockConflictDetector = {
    detectCustomerConflicts: jest.fn(),
    resolveConflicts: jest.fn(),
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
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // 重置 cache mock 到默认行为，避免污染后续测试
    mockCacheService.get.mockReset();
    mockCacheService.set.mockReset();
    mockCacheService.delete.mockReset();
    mockCacheService.exists.mockReset();
    
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
  });

  describe('核心推荐流程测试', () => {
    const mockCustomerData = {
      id: 1,
      totalAssets: 500000,
      monthlyIncome: 30000,
      annualSpend: 150000,
      lastLoginDays: 5,
      registerDays: 365,
      orderCount: 25,
      productCount: 8,
      riskLevel: 'MEDIUM' as const,
      age: 35,
      gender: 'M' as const,
      city: '北京',
      membershipLevel: 'GOLD' as const,
      level: 'GOLD' as const,
    };

    it('应该完成从客户数据到推荐生成的完整流程', async () => {
      // Arrange
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomerData);
      
      mockRuleEngine.generateRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '高价值客户',
          tagCategory: '价值标签',
          confidence: 0.9,
          source: 'RULE' as const,
          reason: '资产和消费双高',
        },
      ]);

      mockFusionEngine.fuseRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '高价值客户',
          tagCategory: '价值标签',
          confidence: 0.9,
          source: 'RULE' as const,
          reason: '资产和消费双高',
        },
      ]);

      mockRecommendationRepo.insert.mockResolvedValue({
        identifiers: [1],
        generatedMaps: [],
        raw: [],
      });

      mockRecommendationRepo.findByIds.mockResolvedValue([
        {
          id: 1,
          customerId: 1,
          tagName: '高价值客户',
          tagCategory: '价值标签',
          confidence: 0.9,
          source: 'RULE',
          reason: '资产和消费双高',
          createdAt: new Date(),
        },
      ]);

      // Act
      const result = await service.generateForCustomer(1);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].tagName).toBe('高价值客户');
      expect(mockCustomerRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockRuleEngine.generateRecommendations).toHaveBeenCalled();
      expect(mockFusionEngine.fuseRecommendations).toHaveBeenCalled();
    });

    it('应该优先使用缓存的推荐结果', async () => {
      // Arrange
      const cachedRecs = [
        {
          id: 1,
          customerId: 1,
          tagName: 'Cached Tag',
          tagCategory: '缓存标签',
          confidence: 0.85,
          source: 'CACHE',
          reason: 'From cache',
          createdAt: new Date(),
        },
      ];
      mockCacheService.get.mockResolvedValue(cachedRecs);

      // Act
      const result = await service.generateForCustomer(1, { useCache: true });

      // Assert
      expect(result).toEqual(cachedRecs);
      expect(mockCacheService.get).toHaveBeenCalledWith('recommendations:1');
      expect(mockCustomerRepo.findOne).not.toHaveBeenCalled();
      expect(mockRuleEngine.generateRecommendations).not.toHaveBeenCalled();
    });

    it('应该在缓存未命中时生成新推荐并缓存', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomerData);
      
      mockRuleEngine.generateRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '新推荐',
          tagCategory: '新标签',
          confidence: 0.88,
          source: 'RULE' as const,
          reason: 'Test',
        },
      ]);

      mockFusionEngine.fuseRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '新推荐',
          tagCategory: '新标签',
          confidence: 0.88,
          source: 'RULE' as const,
          reason: 'Test',
        },
      ]);

      mockRecommendationRepo.insert.mockResolvedValue({
        identifiers: [1],
        generatedMaps: [],
        raw: [],
      });

      mockRecommendationRepo.findByIds.mockResolvedValue([
        {
          id: 1,
          customerId: 1,
          tagName: '新推荐',
          tagCategory: '新标签',
          confidence: 0.88,
          source: 'RULE',
          reason: 'Test',
          createdAt: new Date(),
        },
      ]);

      // Act
      const result = await service.generateForCustomer(1);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('多模式推荐测试', () => {
    const mockCustomerData = {
      id: 1,
      totalAssets: 500000,
      monthlyIncome: 30000,
      annualSpend: 150000,
      lastLoginDays: 5,
      registerDays: 365,
      orderCount: 25,
      productCount: 8,
      riskLevel: 'MEDIUM' as const,
      age: 35,
      gender: 'M' as const,
      city: '北京',
      membershipLevel: 'GOLD' as const,
      level: 'GOLD' as const,
    };

    beforeEach(() => {
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomerData);
      mockCustomerTagRepo.find.mockResolvedValue([]);
    });

    it('应该支持 rule 模式', async () => {
      mockRuleEngine.generateRecommendations.mockResolvedValue([
        { customerId: 1, tagName: 'Rule Tag', tagCategory: 'Category', confidence: 0.9, source: 'RULE' as const, reason: 'Test' },
      ]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);

      const result = await service.generateForCustomer(1, { mode: 'rule' });
      
      expect(mockRuleEngine.generateRecommendations).toHaveBeenCalled();
      expect(mockClusteringEngine.generateRecommendations).not.toHaveBeenCalled();
      expect(mockAssociationEngine.generateRecommendations).not.toHaveBeenCalled();
    });

    it('应该支持 clustering 模式', async () => {
      mockClusteringEngine.generateRecommendations.mockResolvedValue([
        { customerId: 1, tagName: 'Cluster Tag', tagCategory: 'Category', confidence: 0.85, source: 'CLUSTERING' as const, reason: 'Test' },
      ]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);

      const result = await service.generateForCustomer(1, { mode: 'clustering' });
      
      expect(mockClusteringEngine.generateRecommendations).toHaveBeenCalled();
      expect(mockRuleEngine.generateRecommendations).not.toHaveBeenCalled();
    });

    it('应该支持 all 模式（默认）', async () => {
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockClusteringEngine.generateRecommendations.mockResolvedValue([]);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);

      await service.generateForCustomer(1, { mode: 'all' });
      
      expect(mockRuleEngine.generateRecommendations).toHaveBeenCalled();
      expect(mockClusteringEngine.generateRecommendations).toHaveBeenCalled();
      expect(mockAssociationEngine.generateRecommendations).toHaveBeenCalled();
    });
  });

  describe('错误处理测试', () => {
    it('应该在客户不存在时返回空数组', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);

      const result = await service.generateForCustomer(999);

      expect(result).toEqual([]);
    });

    it('应该在引擎失败时返回空数组', async () => {
      mockCustomerRepo.findOne.mockResolvedValue({
        id: 1,
        totalAssets: 500000,
      } as any);

      mockRuleEngine.generateRecommendations.mockRejectedValue(new Error('Engine error'));

      const result = await service.generateForCustomer(1, { mode: 'rule' });

      expect(result).toEqual([]);
    });

    it('应该处理缓存失败的降级逻辑', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));
      mockCustomerRepo.findOne.mockResolvedValue({
        id: 1,
        totalAssets: 500000,
      } as any);
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);

      const result = await service.generateForCustomer(1, { useCache: true });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('边界情况测试', () => {
    const mockCustomerData = {
      id: 1,
      totalAssets: 0,
      monthlyIncome: 0,
      annualSpend: 0,
      lastLoginDays: 0,
      registerDays: 0,
      orderCount: 0,
      productCount: 0,
      riskLevel: 'LOW' as const,
      age: 0,
      gender: 'M' as const,
      city: '北京',
      membershipLevel: 'BRONZE' as const,
      level: 'BRONZE' as const,
    };

    it('应该处理零资产客户', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomerData);
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);

      const result = await service.generateForCustomer(1, { mode: 'rule' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('应该处理超高净值客户', async () => {
      const highNetWorthCustomer = {
        ...mockCustomerData,
        totalAssets: 100000000,
        monthlyIncome: 1000000,
        annualSpend: 50000000,
      };

      mockCustomerRepo.findOne.mockResolvedValue(highNetWorthCustomer);
      mockRuleEngine.generateRecommendations.mockResolvedValue([
        { customerId: 1, tagName: '超高净值客户', tagCategory: '价值标签', confidence: 0.99, source: 'RULE' as const, reason: '资产过亿' },
      ]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([
        { customerId: 1, tagName: '超高净值客户', tagCategory: '价值标签', confidence: 0.99, source: 'RULE' as const, reason: '资产过亿' },
      ]);

      const result = await service.generateForCustomer(1, { mode: 'rule' });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
