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
 * 推荐系统集成测试
 * 覆盖完整的业务流程场景
 */
describe('RecommendationService Integration Tests', () => {
  let service: RecommendationService;

  // Mock Repositories
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
    count: jest.fn(),
    insert: jest.fn(),
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
    detectCustomerConflicts: jest.fn().mockResolvedValue([]),
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
  });

  describe('完整推荐流程测试', () => {
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
    };

    it('应该完成从客户数据到推荐生成的完整流程', async () => {
      // Arrange - 准备数据
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomerData);
      
      // 规则引擎生成推荐
      mockRuleEngine.generateRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '高价值客户',
          tagCategory: '价值标签',
          confidence: 0.9,
          source: 'RULE',
          reason: '资产和消费双高',
        },
      ]);

      // Mock 其他引擎返回空（避免干扰）
      mockClusteringEngine.generateRecommendations.mockResolvedValue([]);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);

      // 融合引擎处理
      mockFusionEngine.fuseRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '高价值客户',
          tagCategory: '价值标签',
          confidence: 0.9,
          source: 'RULE',
          reason: '资产和消费双高',
        },
      ]);

      // Mock 批量插入 - 使用扁平化 ID 数组
      mockRecommendationRepo.insert.mockResolvedValue({
        identifiers: [1],
        generatedMaps: [],
        raw: [],
      });

      // 查询返回
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

      // Act - 执行服务
      const result = await service.generateForCustomer(1);

      // Assert - 验证结果
      expect(result).toBeDefined();
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
          source: 'RULE',
          reason: 'Test',
        },
      ]);

      // Mock 其他引擎返回空
      mockClusteringEngine.generateRecommendations.mockResolvedValue([]);
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);

      mockFusionEngine.fuseRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '新推荐',
          tagCategory: '新标签',
          confidence: 0.88,
          source: 'RULE',
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
      const result = await service.generateForCustomer(1, { useCache: true });

      // Assert
      expect(result).toBeDefined();
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'recommendations:1',
        expect.any(Array),
        expect.any(Number)
      );
    });
  });

  describe('RFM 分析到标签生成流程', () => {
    it('应该基于 RFM 分数为客户生成价值分类标签', async () => {
      // Arrange - 准备高价值客户数据
      const highValueCustomer = {
        id: 1,
        totalAssets: 1000000,
        monthlyIncome: 80000,
        annualSpend: 500000,
        lastLoginDays: 3,
        registerDays: 730,
        orderCount: 50,
        productCount: 15,
        riskLevel: 'LOW' as const,
        age: 40,
        gender: 'M' as const,
        city: '上海',
        membershipLevel: 'PLATINUM' as const,
      };

      mockCustomerRepo.findOne.mockResolvedValue(highValueCustomer);

      // 规则引擎识别高价值客户
      mockRuleEngine.generateRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '重要价值客户',
          tagCategory: 'RFM 标签',
          confidence: 0.95,
          source: 'RULE',
          reason: 'R≥4, F≥4, M≥4',
        },
        {
          customerId: 1,
          tagName: '高净值客户',
          tagCategory: '资产标签',
          confidence: 0.92,
          source: 'RULE',
          reason: '总资产超过 100 万',
        },
      ]);

      // Mock 聚类引擎返回空（避免干扰）
      mockClusteringEngine.generateRecommendations.mockResolvedValue([]);
      
      // Mock 关联引擎返回空（避免干扰）
      mockAssociationEngine.generateRecommendations.mockResolvedValue([]);

      mockFusionEngine.fuseRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '重要价值客户',
          tagCategory: 'RFM 标签',
          confidence: 0.95,
          source: 'RULE',
          reason: 'R≥4, F≥4, M≥4',
        },
        {
          customerId: 1,
          tagName: '高净值客户',
          tagCategory: '资产标签',
          confidence: 0.92,
          source: 'RULE',
          reason: '总资产超过 100 万',
        },
      ]);

      mockRecommendationRepo.insert.mockResolvedValue({
        identifiers: [1, 2],
        generatedMaps: [],
        raw: [],
      });

      mockRecommendationRepo.findByIds.mockResolvedValue([
        {
          id: 1,
          customerId: 1,
          tagName: '重要价值客户',
          tagCategory: 'RFM 标签',
          confidence: 0.95,
          source: 'RULE',
          reason: 'R≥4, F≥4, M≥4',
          createdAt: new Date(),
        },
        {
          id: 2,
          customerId: 1,
          tagName: '高净值客户',
          tagCategory: '资产标签',
          confidence: 0.92,
          source: 'RULE',
          reason: '总资产超过 100 万',
          createdAt: new Date(),
        },
      ]);

      // Act
      const recommendations = await service.generateForCustomer(1);

      // Assert
      expect(recommendations).toHaveLength(2);
      expect(recommendations.some(r => r.tagName === '重要价值客户')).toBe(true);
      expect(recommendations.some(r => r.tagName === '高净值客户')).toBe(true);
      expect(recommendations.every(r => r.confidence >= 0.9)).toBe(true);
    });
  });

  describe('批量处理场景测试', () => {
    it('应该支持批量生成客户推荐并统计成功率', async () => {
      // Arrange
      const customerIds = Array.from({ length: 10 }, (_, i) => i + 1);
      
      jest.spyOn(service, 'generateForCustomer')
        .mockImplementation(async (customerId: number) => {
          return [{
            id: customerId,
            customerId,
            tagName: `Tag ${customerId}`,
            tagCategory: '批量标签',
            confidence: 0.8,
            source: 'rule' as const,
            reason: 'Batch test',
            scoreOverall: 0.85,
            status: RecommendationStatus.PENDING,
            isAccepted: false,
            acceptedAt: null,
            acceptedBy: null,
            modifiedTagName: null,
            feedbackReason: null,
            createdAt: new Date(),
            expiresAt: null,
            updatedAt: new Date(),
          }];
        });

      // Act
      const startTime = Date.now();
      const successCount = await service.batchGenerate(customerIds);
      const duration = Date.now() - startTime;

      // Assert
      expect(successCount).toBe(10);
      expect(service.generateForCustomer).toHaveBeenCalledTimes(10);
      expect(duration).toBeLessThan(30000); // 30 秒内完成
    });

    it('应该在部分失败时继续处理剩余客户', async () => {
      // Arrange
      const customerIds = [1, 999, 2, 888, 3]; // 999 和 888 不存在
      
      jest.spyOn(service, 'generateForCustomer')
        .mockImplementation(async (customerId: number) => {
          if (customerId === 999 || customerId === 888) {
            throw new Error('Customer not found');
          }
          return [];
        });

      // Act
      const successCount = await service.batchGenerate(customerIds);

      // Assert
      expect(successCount).toBe(3); // 成功 3 个
      expect(service.generateForCustomer).toHaveBeenCalledTimes(5);
    });
  });

  describe('并发场景测试', () => {
    it('应该支持多个客户同时请求推荐', async () => {
      // Arrange - 准备 5 个客户的模拟数据
      const customerIds = [1, 2, 3, 4, 5];

      // Mock 所有客户的数据
      customerIds.forEach(id => {
        mockCustomerRepo.findOne.mockResolvedValueOnce({
          id,
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
        });
        
        // Mock 规则引擎返回
        mockRuleEngine.generateRecommendations.mockResolvedValueOnce([
          {
            customerId: id,
            tagName: `高价值客户-${id}`,
            tagCategory: '价值标签',
            confidence: 0.9,
            source: 'RULE',
            reason: '资产和消费双高',
          },
        ]);
        
        // Mock 融合引擎返回
        mockFusionEngine.fuseRecommendations.mockResolvedValueOnce([
          {
            customerId: id,
            tagName: `高价值客户-${id}`,
            tagCategory: '价值标签',
            confidence: 0.9,
            source: 'RULE',
            reason: '资产和消费双高',
          },
        ]);
        
        // Mock 批量插入
        mockRecommendationRepo.insert.mockResolvedValue({
          identifiers: [{ id }],
        });
        
        // Mock 查询返回
        mockRecommendationRepo.findByIds.mockResolvedValueOnce([
          {
            id: 1,
            customerId: id,
            tagName: `高价值客户-${id}`,
            tagCategory: '价值标签',
            confidence: 0.85,
            source: 'RULE',
            reason: 'Concurrency test',
            createdAt: new Date(),
          },
        ]);
      });

      // Act - 并发请求
      const promises = customerIds.map(id => 
        service.generateForCustomer(id)
      );
      
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(5);
      results.forEach((recs, index) => {
        expect(recs).toBeDefined();
        expect(Array.isArray(recs)).toBe(true);
        expect(recs.length).toBeGreaterThan(0);
        expect(mockCustomerRepo.findOne).toHaveBeenCalledWith({
          where: { id: customerIds[index] },
        });
      });
    });

    it('应该正确处理缓存命中和未命中的混合场景', async () => {
      // Arrange
      const existingRecs = [{
        id: 1,
        customerId: 1,
        tagName: 'Cached',
        tagCategory: '缓存',
        confidence: 0.9,
        source: 'CACHE',
        reason: 'Cached result',
        createdAt: new Date(),
      }];

      mockCacheService.get.mockImplementation(async (key: string) => {
        if (key === 'recommendations:1') {
          return existingRecs;
        }
        return null;
      });

      mockCustomerRepo.findOne.mockResolvedValue({
        id: 2,
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
      });

      mockRuleEngine.generateRecommendations.mockResolvedValue([{
        customerId: 2,
        tagName: 'New Rec',
        tagCategory: '新推荐',
        confidence: 0.85,
        source: 'RULE',
        reason: 'New',
      }]);

      mockFusionEngine.fuseRecommendations.mockResolvedValue([{
        customerId: 2,
        tagName: 'New Rec',
        tagCategory: '新推荐',
        confidence: 0.85,
        source: 'RULE',
        reason: 'New',
      }]);

      mockRecommendationRepo.insert.mockResolvedValue({
        identifiers: [{ id: 2 }],
      });

      mockRecommendationRepo.findByIds.mockResolvedValue([{
        id: 2,
        customerId: 2,
        tagName: 'New Rec',
        tagCategory: '新推荐',
        confidence: 0.85,
        source: 'RULE',
        reason: 'New',
        createdAt: new Date(),
      }]);

      // Act
      const results = await Promise.all([
        service.generateForCustomer(1), // 缓存命中
        service.generateForCustomer(2), // 缓存未命中
        service.generateForCustomer(3), // 缓存未命中
      ]);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(existingRecs); // 缓存命中
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();
    });
  });

  describe('边界情况测试', () => {
    it('应该处理零资产客户', async () => {
      // Arrange - 准备零资产客户数据
      const zeroAssetCustomer = {
        id: 1,
        totalAssets: 0,
        monthlyIncome: 0,
        annualSpend: 0,
        lastLoginDays: 999,
        registerDays: 1,
        orderCount: 0,
        productCount: 0,
        riskLevel: 'LOW' as const,
        age: 25,
        gender: 'F' as const,
        city: '北京',
        membershipLevel: 'BRONZE' as const,
      };

      mockCustomerRepo.findOne.mockResolvedValue(zeroAssetCustomer);
      
      // 规则引擎可能仍会生成一些基础推荐（如"潜在客户"）
      mockRuleEngine.generateRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '睡眠客户',
          tagCategory: '活跃标签',
          confidence: 0.3,
          source: 'RULE',
          reason: '长期未登录',
        },
      ]);
      
      mockFusionEngine.fuseRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '睡眠客户',
          tagCategory: '活跃标签',
          confidence: 0.3,
          source: 'RULE',
          reason: '长期未登录',
        },
      ]);

      // Act
      const recommendations = await service.generateForCustomer(1);

      // Assert - 即使资产为零，也应该有推荐结果
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].tagName).toBeDefined();
    });

    it('应该处理超高净值客户', async () => {
      // Arrange
      const ultraHighNetWorthCustomer = {
        id: 1,
        totalAssets: 100000000, // 1 亿
        monthlyIncome: 5000000,
        annualSpend: 50000000,
        lastLoginDays: 1,
        registerDays: 1825,
        orderCount: 1000,
        productCount: 100,
        riskLevel: 'LOW' as const,
        age: 50,
        gender: 'M' as const,
        city: '上海',
        membershipLevel: 'DIAMOND' as const,
      };

      mockCustomerRepo.findOne.mockResolvedValue(ultraHighNetWorthCustomer);
      
      mockRuleEngine.generateRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '超高净值客户',
          tagCategory: '顶级 VIP',
          confidence: 0.99,
          source: 'RULE',
          reason: '资产过亿',
        },
      ]);

      mockFusionEngine.fuseRecommendations.mockResolvedValue([
        {
          customerId: 1,
          tagName: '超高净值客户',
          tagCategory: '顶级 VIP',
          confidence: 0.99,
          source: 'RULE',
          reason: '资产过亿',
        },
      ]);

      mockRecommendationRepo.insert.mockResolvedValue({
        identifiers: [{ id: 1 }],
      });

      mockRecommendationRepo.findByIds.mockResolvedValue([
        {
          id: 1,
          customerId: 1,
          tagName: '超高净值客户',
          tagCategory: '顶级 VIP',
          confidence: 0.99,
          source: 'RULE',
          reason: '资产过亿',
          createdAt: new Date(),
        },
      ]);

      // Act
      const recommendations = await service.generateForCustomer(1);

      // Assert
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('应该处理不存在的客户', async () => {
      // Arrange - 客户不存在，服务会返回空数组
      mockCustomerRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.generateForCustomer(999999);

      // Assert - 验证返回空数组（优雅降级）
      expect(result).toEqual([]);
      expect(mockCustomerRepo.findOne).toHaveBeenCalledWith({
        where: { id: 999999 },
      });
    });

  });
});
