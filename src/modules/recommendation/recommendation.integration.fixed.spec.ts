import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationService } from './recommendation.service';
import { TagRecommendation, RecommendationStatus } from './entities/tag-recommendation.entity';
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

describe('RecommendationService Integration Tests (Fixed)', () => {
  let service: RecommendationService;

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
  });

  describe('核心推荐流程', () => {
    it('应该成功为客户生成推荐', async () => {
      const mockCustomer = {
        id: 1,
        totalAssets: 500000,
        monthlyIncome: 30000,
      } as Customer;

      const mockRuleRecs = [{
        customerId: 1,
        tagName: '高价值客户',
        tagCategory: '价值标签',
        confidence: 0.9,
        source: 'rule' as const,
        reason: '资产和消费双高',
      }];

      const mockFusedRecs = [{
        ...mockRuleRecs[0],
        scoreOverall: 0.85,
        status: RecommendationStatus.PENDING,
      }];

      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);
      mockRuleEngine.generateRecommendations.mockResolvedValue(mockRuleRecs);
      mockFusionEngine.fuseRecommendations.mockResolvedValue(mockFusedRecs);
      mockRecommendationRepo.save.mockResolvedValue(mockFusedRecs);

      const result = await service.generateForCustomer(1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('应该处理不存在的客户', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);

      await expect(service.generateForCustomer(999999))
        .rejects
        .toThrow();
    });

    it('应该在缓存存在时返回缓存结果', async () => {
      const cachedRecs = [{
        id: 1,
        customerId: 1,
        tagName: 'Cached Tag',
        tagCategory: '缓存标签',
        confidence: 0.85,
        source: 'rule' as const,
        reason: 'From cache',
        scoreOverall: 0.8,
        status: RecommendationStatus.PENDING,
        createdAt: new Date(),
      }];

      mockCacheService.get.mockResolvedValue(cachedRecs);

      const result = await service.generateForCustomer(1);

      expect(result).toEqual(cachedRecs);
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockRuleEngine.generateRecommendations).not.toHaveBeenCalled();
    });
  });

  describe('批量处理', () => {
    it('应该支持批量生成客户推荐', async () => {
      const customerIds = [1, 2, 3];
      
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);
      mockRecommendationRepo.save.mockResolvedValue([]);

      const successCount = await service.batchGenerate(customerIds);

      expect(successCount).toBe(3);
      expect(mockRuleEngine.generateRecommendations).toHaveBeenCalledTimes(3);
    });

    it('应该在部分失败时继续处理', async () => {
      const customerIds = [1, 2, 3];
      
      mockRuleEngine.generateRecommendations
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);
      mockRecommendationRepo.save.mockResolvedValue([]);

      const successCount = await service.batchGenerate(customerIds);

      expect(successCount).toBeLessThan(3);
      expect(successCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('并发场景', () => {
    it('应该支持多个客户同时请求推荐', async () => {
      const customerIds = Array.from({ length: 5 }, (_, i) => i + 1);
      
      mockRuleEngine.generateRecommendations.mockResolvedValue([]);
      mockFusionEngine.fuseRecommendations.mockResolvedValue([]);
      mockRecommendationRepo.save.mockResolvedValue([]);

      const promises = customerIds.map(id => service.generateForCustomer(id));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockRuleEngine.generateRecommendations).toHaveBeenCalledTimes(5);
    });
  });
});
