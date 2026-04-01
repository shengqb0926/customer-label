import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { RecommendationSeedService } from './services/recommendation-seed.service';
import { TagRecommendation } from './entities/tag-recommendation.entity';
import { GetRecommendationsDto, PaginatedResponse } from './dto/get-recommendations.dto';

describe('RecommendationController', () => {
  let controller: RecommendationController;
  let service: RecommendationService;
  let seedService: RecommendationSeedService;

  const mockRecommendation: Partial<TagRecommendation> = {
    id: 1,
    customerId: 100,
    tagName: '高价值客户',
    confidence: 0.95,
    source: 'rule',
    isAccepted: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [
        {
          provide: RecommendationService,
          useValue: {
            findByCustomerWithPagination: jest.fn(),
            findAllWithPagination: jest.fn(),
            findByCustomer: jest.fn(),
            generateForCustomer: jest.fn(),
            batchGenerate: jest.fn(),
            getStats: jest.fn(),
            getStatusStats: jest.fn(),
            getActiveRules: jest.fn(),
            getClusteringConfigs: jest.fn(),
            acceptRecommendation: jest.fn(),
            rejectRecommendation: jest.fn(),
            batchAcceptRecommendations: jest.fn(),
            batchRejectRecommendations: jest.fn(),
          },
        },
        {
          provide: RecommendationSeedService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<RecommendationController>(RecommendationController);
    service = module.get<RecommendationService>(RecommendationService);
    seedService = module.get<RecommendationSeedService>(RecommendationSeedService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCustomerRecommendations', () => {
    it('应该获取客户的推荐列表（默认参数）', async () => {
      const mockResponse: PaginatedResponse<TagRecommendation> = {
        data: [mockRecommendation as any],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      jest.spyOn(service, 'findByCustomerWithPagination').mockResolvedValue(mockResponse);

      const result = await controller.getCustomerRecommendations(100, {});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(service.findByCustomerWithPagination).toHaveBeenCalledWith(100, {});
    });

    it('应该处理分页和过滤参数', async () => {
      const query: GetRecommendationsDto = {
        page: 2,
        limit: 30,
        minConfidence: 0.8,
        isAccepted: true,
        sortBy: 'confidence',
        sortOrder: 'desc',
      };

      const mockResponse: PaginatedResponse<TagRecommendation> = {
        data: [mockRecommendation as any],
        total: 50,
        page: 2,
        limit: 30,
        totalPages: 2,
      };

      jest.spyOn(service, 'findByCustomerWithPagination').mockResolvedValue(mockResponse);

      const result = await controller.getCustomerRecommendations(100, query);

      expect(result).toEqual(mockResponse);
      expect(service.findByCustomerWithPagination).toHaveBeenCalledWith(100, query);
    });

    it('应该处理空结果', async () => {
      const mockResponse: PaginatedResponse<TagRecommendation> = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      jest.spyOn(service, 'findByCustomerWithPagination').mockResolvedValue(mockResponse);

      const result = await controller.getCustomerRecommendations(100, {});

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('应该处理排序参数 asc', async () => {
      const mockResponse: PaginatedResponse<TagRecommendation> = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      jest.spyOn(service, 'findByCustomerWithPagination').mockResolvedValue(mockResponse);

      await controller.getCustomerRecommendations(100, { sortBy: 'confidence', sortOrder: 'asc' });

      expect(service.findByCustomerWithPagination).toHaveBeenCalledWith(
        100,
        expect.objectContaining({ sortBy: 'confidence', sortOrder: 'asc' })
      );
    });

    it('应该处理排序参数 desc', async () => {
      const mockResponse: PaginatedResponse<TagRecommendation> = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      jest.spyOn(service, 'findByCustomerWithPagination').mockResolvedValue(mockResponse);

      await controller.getCustomerRecommendations(100, { sortBy: 'createdAt', sortOrder: 'desc' });

      expect(service.findByCustomerWithPagination).toHaveBeenCalledWith(
        100,
        expect.objectContaining({ sortBy: 'createdAt', sortOrder: 'desc' })
      );
    });
  });

  describe('getAllRecommendations', () => {
    it('应该获取全局推荐列表', async () => {
      const mockResponse: PaginatedResponse<TagRecommendation> = {
        data: [mockRecommendation as any],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      jest.spyOn(service, 'findAllWithPagination').mockResolvedValue(mockResponse);

      const result = await controller.getAllRecommendations({});

      expect(result).toEqual(mockResponse);
      expect(service.findAllWithPagination).toHaveBeenCalledWith({});
    });

    it('应该处理多条件查询', async () => {
      const query: GetRecommendationsDto = {
        customerName: '张三',
        minConfidence: 0.7,
      };

      const mockResponse: PaginatedResponse<TagRecommendation> = {
        data: [mockRecommendation as any],
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2,
      };

      jest.spyOn(service, 'findAllWithPagination').mockResolvedValue(mockResponse);

      const result = await controller.getAllRecommendations(query);

      expect(result).toEqual(mockResponse);
      expect(service.findAllWithPagination).toHaveBeenCalledWith(query);
    });
  });

  describe('getSimpleRecommendations', () => {
    it('应该获取简化版推荐列表', async () => {
      const recommendations = [mockRecommendation as any];

      jest.spyOn(service, 'findByCustomer').mockResolvedValue(recommendations);

      const result = await controller.getSimpleRecommendations(100);

      expect(result).toEqual(recommendations);
      expect(service.findByCustomer).toHaveBeenCalledWith(100);
    });
  });

  describe('generateRecommendations', () => {
    it('应该使用 rule 引擎生成推荐（默认模式）', async () => {
      const recommendations = [mockRecommendation as any];

      jest.spyOn(service, 'generateForCustomer').mockResolvedValue(recommendations);

      const result = await controller.generateRecommendations(100);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.recommendations).toEqual(recommendations);
      expect(service.generateForCustomer).toHaveBeenCalledWith(100, {
        mode: 'rule',
        useCache: true,
      });
    });

    it('应该使用 clustering 引擎生成推荐', async () => {
      const recommendations = [mockRecommendation as any];

      jest.spyOn(service, 'generateForCustomer').mockResolvedValue(recommendations);

      const result = await controller.generateRecommendations(100, 'clustering', true);

      expect(result.success).toBe(true);
      expect(result.message).toContain('clustering');
      expect(service.generateForCustomer).toHaveBeenCalledWith(100, {
        mode: 'clustering',
        useCache: true,
      });
    });

    it('应该使用 association 引擎生成推荐', async () => {
      const recommendations: TagRecommendation[] = [];

      jest.spyOn(service, 'generateForCustomer').mockResolvedValue(recommendations);

      const result = await controller.generateRecommendations(100, 'association', false);

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      expect(service.generateForCustomer).toHaveBeenCalledWith(100, {
        mode: 'association',
        useCache: false,
      });
    });

    it('应该处理生成失败', async () => {
      jest.spyOn(service, 'generateForCustomer').mockRejectedValue(new Error('生成失败'));

      await expect(controller.generateRecommendations(100, 'rule')).rejects.toThrow('生成失败');
    });
  });

  describe('batchGenerate', () => {
    it('应该批量生成推荐', async () => {
      const customerIds = [1, 2, 3];
      const queuedCount = 3;

      jest.spyOn(service, 'batchGenerate').mockResolvedValue(queuedCount);

      const result = await controller.batchGenerate({ customerIds });

      expect(result.total).toBe(3);
      expect(result.queued).toBe(3);
      expect(service.batchGenerate).toHaveBeenCalledWith(customerIds);
    });

    it('应该拒绝空的 customerIds', async () => {
      await expect(controller.batchGenerate({ customerIds: [] }))
        .rejects.toThrow('customerIds is required');
    });

    it('应该处理部分成功', async () => {
      const customerIds = [1, 2, 3];
      const queuedCount = 2;

      jest.spyOn(service, 'batchGenerate').mockResolvedValue(queuedCount);

      const result = await controller.batchGenerate({ customerIds });

      expect(result.total).toBe(3);
      expect(result.queued).toBe(2);
    });
  });

  describe('getStats', () => {
    it('应该获取统计信息', async () => {
      const stats = {
        total: 1000,
        bySource: { rule: 600, clustering: 300, association: 100 },
        avgConfidence: 0.85,
      };

      jest.spyOn(service, 'getStats').mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(result).toEqual(stats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('getStatusStats', () => {
    it('应该获取状态统计', async () => {
      const stats = {
        total: 100,
        pending: 60,
        accepted: 30,
        rejected: 10,
      };

      jest.spyOn(service, 'getStatusStats').mockResolvedValue(stats);

      const result = await controller.getStatusStats({});

      expect(result).toEqual(stats);
      expect(service.getStatusStats).toHaveBeenCalledWith({});
    });

    it('应该处理带过滤条件的状态统计', async () => {
      const options: GetRecommendationsDto = {
        minConfidence: 0.7,
      };

      const stats = {
        total: 50,
        pending: 30,
        accepted: 15,
        rejected: 5,
      };

      jest.spyOn(service, 'getStatusStats').mockResolvedValue(stats);

      const result = await controller.getStatusStats(options);

      expect(result).toEqual(stats);
      expect(service.getStatusStats).toHaveBeenCalledWith(options);
    });
  });

  describe('acceptRecommendation', () => {
    it('应该接受推荐（无额外参数）', async () => {
      jest.spyOn(service, 'acceptRecommendation').mockResolvedValue(mockRecommendation as any);

      const result = await controller.acceptRecommendation(1);

      expect(result).toEqual(mockRecommendation);
      expect(service.acceptRecommendation).toHaveBeenCalledWith(1, 1, undefined, undefined);
    });

    it('应该接受推荐并修改标签名', async () => {
      const modifiedTagName = '修改后的标签';

      jest.spyOn(service, 'acceptRecommendation').mockResolvedValue(mockRecommendation as any);

      const result = await controller.acceptRecommendation(1, { modifiedTagName });

      expect(result).toEqual(mockRecommendation);
      expect(service.acceptRecommendation).toHaveBeenCalledWith(1, 1, modifiedTagName, undefined);
    });

    it('应该接受推荐并提供反馈原因', async () => {
      const feedbackReason = '推荐准确';

      jest.spyOn(service, 'acceptRecommendation').mockResolvedValue(mockRecommendation as any);

      const result = await controller.acceptRecommendation(1, { feedbackReason });

      expect(result).toEqual(mockRecommendation);
      expect(service.acceptRecommendation).toHaveBeenCalledWith(1, 1, undefined, feedbackReason);
    });
  });

  describe('rejectRecommendation', () => {
    it('应该拒绝推荐（无原因）', async () => {
      jest.spyOn(service, 'rejectRecommendation').mockResolvedValue(mockRecommendation as any);

      const result = await controller.rejectRecommendation(1);

      expect(result).toEqual(mockRecommendation);
      expect(service.rejectRecommendation).toHaveBeenCalledWith(1, 1, undefined);
    });

    it('应该拒绝推荐并提供原因', async () => {
      const feedbackReason = '推荐不准确';

      jest.spyOn(service, 'rejectRecommendation').mockResolvedValue(mockRecommendation as any);

      const result = await controller.rejectRecommendation(1, { feedbackReason });

      expect(result).toEqual(mockRecommendation);
      expect(service.rejectRecommendation).toHaveBeenCalledWith(1, 1, feedbackReason);
    });
  });

  describe('batchAcceptRecommendations', () => {
    it('应该批量接受推荐', async () => {
      const ids = [1, 2, 3];

      jest.spyOn(service, 'batchAcceptRecommendations').mockResolvedValue(3);

      const result = await controller.batchAcceptRecommendations({ ids });

      expect(result.success).toBe(3);
      expect(result.total).toBe(3);
      expect(service.batchAcceptRecommendations).toHaveBeenCalledWith(ids, 1, undefined);
    });

    it('应该批量接受推荐并自动打标签', async () => {
      const ids = [1, 2, 3];

      jest.spyOn(service, 'batchAcceptRecommendations').mockResolvedValue(3);

      const result = await controller.batchAcceptRecommendations({ ids, autoTag: true });

      expect(result.success).toBe(3);
      expect(service.batchAcceptRecommendations).toHaveBeenCalledWith(ids, 1, true);
    });
  });

  describe('batchRejectRecommendations', () => {
    it('应该批量拒绝推荐', async () => {
      const ids = [1, 2, 3];
      const reason = '标签不准确';

      jest.spyOn(service, 'batchRejectRecommendations').mockResolvedValue(3);

      const result = await controller.batchRejectRecommendations({ ids, reason });

      expect(result.success).toBe(3);
      expect(result.total).toBe(3);
      expect(service.batchRejectRecommendations).toHaveBeenCalledWith(ids, 1, reason);
    });
  });
});
