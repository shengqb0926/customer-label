import { Test, TestingModule } from '@nestjs/testing';
import { ScoringController } from './scoring.controller';
import { ScoringService } from './scoring.service';
import { TagScore } from './entities/tag-score.entity';
import { GetScoresDto, RecommendationLevel } from './dto/get-scores.dto';

describe('ScoringController', () => {
  let controller: ScoringController;
  let service: ScoringService;

  const mockScoringService = {
    getTagScore: jest.fn(),
    findAllWithPagination: jest.fn(),
    getAllScores: jest.fn(),
    updateTagScore: jest.fn(),
    batchUpdateScores: jest.fn(),
    getByRecommendation: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScoringController],
      providers: [
        {
          provide: ScoringService,
          useValue: mockScoringService,
        },
      ],
    }).compile();

    controller = module.get<ScoringController>(ScoringController);
    service = module.get<ScoringService>(ScoringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被定义', () => {
    expect(controller).toBeDefined();
  });

  describe('getTagScore', () => {
    it('应该返回标签评分', async () => {
      const tagId = 1;
      const mockScore: Partial<TagScore> = {
        tagId,
        tagName: '测试标签',
        overallScore: 0.85,
      };
      
      mockScoringService.getTagScore.mockResolvedValue(mockScore);

      const result = await controller.getTagScore(tagId);

      expect(result).toEqual(mockScore);
      expect(service.getTagScore).toHaveBeenCalledWith(tagId);
      expect(service.getTagScore).toHaveBeenCalledTimes(1);
    });

    it('当标签不存在时应该返回 null', async () => {
      mockScoringService.getTagScore.mockResolvedValue(null);

      const result = await controller.getTagScore(999);

      expect(result).toBeNull();
      expect(service.getTagScore).toHaveBeenCalledWith(999);
    });
  });

  describe('getAllScores', () => {
    it('应该返回分页的评分列表', async () => {
      const query: GetScoresDto = {
        page: 1,
        limit: 20,
      };
      
      const mockResponse = {
        data: [
          { tagId: 1, tagName: '标签 1', overallScore: 0.9 },
          { tagId: 2, tagName: '标签 2', overallScore: 0.8 },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockScoringService.findAllWithPagination.mockResolvedValue(mockResponse);

      const result = await controller.getAllScores(query);

      expect(result).toEqual(mockResponse);
      expect(service.findAllWithPagination).toHaveBeenCalledWith(query);
      expect(service.findAllWithPagination).toHaveBeenCalledTimes(1);
    });

    it('应该处理带过滤条件的查询', async () => {
      const query: GetScoresDto = {
        page: 1,
        limit: 10,
        tagName: '年龄',
        recommendation: RecommendationLevel.STRONGLY_RECOMMENDED,
        minScore: 0.7,
        maxScore: 0.95,
        sortBy: 'overallScore',
        sortOrder: 'desc',
      };

      const mockResponse = {
        data: [{ tagId: 1, tagName: '年龄段', overallScore: 0.85 }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockScoringService.findAllWithPagination.mockResolvedValue(mockResponse);

      const result = await controller.getAllScores(query);

      expect(result).toEqual(mockResponse);
      expect(service.findAllWithPagination).toHaveBeenCalledWith(query);
    });
  });

  describe('getSimpleAllScores', () => {
    it('应该返回所有评分列表（简化版）', async () => {
      const mockScores: TagScore[] = [
        { tagId: 1, tagName: '标签 1', overallScore: 0.9 } as TagScore,
        { tagId: 2, tagName: '标签 2', overallScore: 0.8 } as TagScore,
      ];

      mockScoringService.getAllScores.mockResolvedValue(mockScores);

      const result = await controller.getSimpleAllScores();

      expect(result).toEqual(mockScores);
      expect(service.getAllScores).toHaveBeenCalledTimes(1);
    });

    it('当没有数据时返回空数组', async () => {
      mockScoringService.getAllScores.mockResolvedValue([]);

      const result = await controller.getSimpleAllScores();

      expect(result).toEqual([]);
      expect(service.getAllScores).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateScore', () => {
    it('应该更新标签评分', async () => {
      const body = {
        tagId: 1,
        overallScore: 0.85,
        coverageScore: 0.8,
        discriminationScore: 0.9,
        stabilityScore: 0.85,
        businessValueScore: 0.85,
      };

      const updatedScore: TagScore = {
        ...body,
        tagName: '更新后的标签',
      } as TagScore;

      mockScoringService.updateTagScore.mockResolvedValue(updatedScore);

      const result = await controller.updateScore(body);

      expect(result).toEqual(updatedScore);
      expect(service.updateTagScore).toHaveBeenCalledWith(body);
      expect(service.updateTagScore).toHaveBeenCalledTimes(1);
    });
  });

  describe('batchUpdate', () => {
    it('应该批量更新标签评分', async () => {
      const scores = [
        { tagId: 1, overallScore: 0.9 },
        { tagId: 2, overallScore: 0.85 },
      ];

      const updatedScores: TagScore[] = scores.map(s => ({
        ...s,
        tagName: `标签${s.tagId}`,
      })) as TagScore[];

      mockScoringService.batchUpdateScores.mockResolvedValue(updatedScores);

      const result = await controller.batchUpdate(scores);

      expect(result).toEqual(updatedScores);
      expect(service.batchUpdateScores).toHaveBeenCalledWith(scores);
      expect(service.batchUpdateScores).toHaveBeenCalledTimes(1);
    });

    it('应该处理空的批量更新', async () => {
      mockScoringService.batchUpdateScores.mockResolvedValue([]);

      const result = await controller.batchUpdate([]);

      expect(result).toEqual([]);
      expect(service.batchUpdateScores).toHaveBeenCalledWith([]);
    });
  });

  describe('getByRecommendation', () => {
    it('应该按推荐等级获取标签', async () => {
      const level = RecommendationLevel.STRONGLY_RECOMMENDED;
      const mockScores: TagScore[] = [
        { tagId: 1, tagName: '高价值客户', recommendation: level } as TagScore,
        { tagId: 2, tagName: '高消费群体', recommendation: level } as TagScore,
      ];

      mockScoringService.getByRecommendation.mockResolvedValue(mockScores);

      const result = await controller.getByRecommendation(level);

      expect(result).toEqual(mockScores);
      expect(service.getByRecommendation).toHaveBeenCalledWith(level);
      expect(service.getByRecommendation).toHaveBeenCalledTimes(1);
    });

    it('当没有符合条件的标签时返回空数组', async () => {
      mockScoringService.getByRecommendation.mockResolvedValue([]);

      const result = await controller.getByRecommendation(RecommendationLevel.DISABLED);

      expect(result).toEqual([]);
      expect(service.getByRecommendation).toHaveBeenCalledWith(RecommendationLevel.DISABLED);
    });
  });

  describe('getStats', () => {
    it('应该返回评分统计信息', async () => {
      const mockStats = {
        totalTags: 100,
        averageScore: 0.75,
        distribution: {
          '强烈推荐': 10,
          '推荐': 30,
          '中性': 40,
          '不推荐': 15,
          '禁用': 5,
        },
      };

      mockScoringService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledTimes(1);
    });

    it('应该处理空的统计数据', async () => {
      const mockStats = {
        totalTags: 0,
        averageScore: 0,
        distribution: {},
      };

      mockScoringService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
    });
  });

  describe('控制器依赖注入', () => {
    it('应该有正确的 ScoringService 实例', () => {
      expect(controller['service']).toBe(service);
    });

    it('Logger 应该被正确初始化', () => {
      expect(controller['logger']).toBeDefined();
    });
  });
});