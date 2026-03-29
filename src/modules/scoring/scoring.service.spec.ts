import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoringService, UpdateTagScoreDto } from './scoring.service';
import { TagScore } from './entities/tag-score.entity';
import { CacheService } from '../../infrastructure/redis';
import { GetScoresDto } from './dto/get-scores.dto';

describe('ScoringService', () => {
  let service: ScoringService;
  let scoreRepo: Repository<TagScore>;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        {
          provide: getRepositoryToken(TagScore),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(), // 使用 delete 而不是 del
          },
        },
      ],
    }).compile();

    service = module.get<ScoringService>(ScoringService);
    scoreRepo = module.get<Repository<TagScore>>(getRepositoryToken(TagScore));
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateOverallScore', () => {
    it('should calculate weighted overall score correctly', () => {
      const scores = {
        coverageScore: 80,
        discriminationScore: 90,
        stabilityScore: 85,
        businessValueScore: 95,
      };

      const result = service.calculateOverallScore(scores);

      // 权重：coverage 0.2, discrimination 0.3, stability 0.2, businessValue 0.3
      const expected = 80 * 0.2 + 90 * 0.3 + 85 * 0.2 + 95 * 0.3;
      expect(result).toBeCloseTo(expected, 4);
    });

    it('should handle zero scores', () => {
      const scores = {
        coverageScore: 0,
        discriminationScore: 0,
        stabilityScore: 0,
        businessValueScore: 0,
      };

      const result = service.calculateOverallScore(scores);
      expect(result).toBe(0);
    });

    it('should handle perfect scores', () => {
      const scores = {
        coverageScore: 100,
        discriminationScore: 100,
        stabilityScore: 100,
        businessValueScore: 100,
      };

      const result = service.calculateOverallScore(scores);
      expect(result).toBe(100);
    });
  });

  describe('determineLevel', () => {
    it('should return SSS for score >= 95', () => {
      expect(service.determineLevel(95)).toBe('SSS');
      expect(service.determineLevel(100)).toBe('SSS');
    });

    it('should return SS for score between 90 and 95', () => {
      expect(service.determineLevel(90)).toBe('SS');
      expect(service.determineLevel(94.99)).toBe('SS');
    });

    it('should return S for score between 80 and 90', () => {
      expect(service.determineLevel(80)).toBe('S');
      expect(service.determineLevel(89.99)).toBe('S');
    });

    it('should return A for score between 70 and 80', () => {
      expect(service.determineLevel(70)).toBe('A');
      expect(service.determineLevel(79.99)).toBe('A');
    });

    it('should return B for score between 60 and 70', () => {
      expect(service.determineLevel(60)).toBe('B');
      expect(service.determineLevel(69.99)).toBe('B');
    });

    it('should return C for score < 60', () => {
      expect(service.determineLevel(59)).toBe('C');
      expect(service.determineLevel(0)).toBe('C');
    });
  });

  describe('determineRecommendation', () => {
    it('should return 强烈推荐 for score >= 0.85', () => {
      expect(service.determineRecommendation(0.85)).toBe('强烈推荐');
      expect(service.determineRecommendation(1.0)).toBe('强烈推荐');
    });

    it('should return 推荐 for score between 0.75 and 0.85', () => {
      expect(service.determineRecommendation(0.75)).toBe('推荐');
      expect(service.determineRecommendation(0.84)).toBe('推荐');
    });

    it('should return 中性 for score between 0.65 and 0.75', () => {
      expect(service.determineRecommendation(0.65)).toBe('中性');
      expect(service.determineRecommendation(0.74)).toBe('中性');
    });

    it('should return 不推荐 for score between 0.5 and 0.65', () => {
      expect(service.determineRecommendation(0.5)).toBe('不推荐');
      expect(service.determineRecommendation(0.64)).toBe('不推荐');
    });

    it('should return 禁用 for score < 0.5', () => {
      expect(service.determineRecommendation(0.49)).toBe('禁用');
      expect(service.determineRecommendation(0)).toBe('禁用');
    });
  });

  describe('generateRecommendation', () => {
    it('should recommend priority optimization for low coverage', () => {
      const dto = {
        tagId: 1,
        tagName: '测试标签',
        coverageScore: 40,
        coverageValue: 0.3,
        discriminationScore: 80,
        discriminationIv: 0.5,
        stabilityScore: 85,
        stabilityPsi: 0.1,
        businessValueScore: 90,
        businessValueRoi: 5.0,
      };

      const result = service.generateRecommendation(dto as any);

      expect(result.recommendation).toContain('覆盖度');
      expect(result.recommendation).toContain('优化');
    });

    it('should recommend feature engineering for low discrimination', () => {
      const dto = {
        tagId: 1,
        tagName: '测试标签',
        coverageScore: 80,
        coverageValue: 0.7,
        discriminationScore: 50,
        discriminationIv: 0.2,
        stabilityScore: 85,
        stabilityPsi: 0.1,
        businessValueScore: 90,
        businessValueRoi: 5.0,
      };

      const result = service.generateRecommendation(dto as any);

      expect(result.recommendation).toContain('区分度');
      expect(result.recommendation).toContain('特征工程');
    });

    it('should recommend monitoring for low stability', () => {
      const dto = {
        tagId: 1,
        tagName: '测试标签',
        coverageScore: 80,
        coverageValue: 0.7,
        discriminationScore: 85,
        discriminationIv: 0.5,
        stabilityScore: 50,
        stabilityPsi: 0.3,
        businessValueScore: 90,
        businessValueRoi: 5.0,
      };

      const result = service.generateRecommendation(dto as any);

      expect(result.recommendation).toContain('稳定性');
      expect(result.recommendation).toContain('监控');
    });

    it('should recommend promotion for high quality tags', () => {
      const dto = {
        tagId: 1,
        tagName: '优质标签',
        coverageScore: 90,
        coverageValue: 0.8,
        discriminationScore: 90,
        discriminationIv: 0.6,
        stabilityScore: 90,
        stabilityPsi: 0.05,
        businessValueScore: 95,
        businessValueRoi: 8.0,
      };

      const result = service.generateRecommendation(dto as any);

      expect(result.recommendation).toContain('推广');
      expect(result.recommendation).toContain('应用');
    });
  });

  describe('updateTagScores', () => {
    it('should update tag score successfully', async () => {
      const dto: UpdateTagScoreDto = {
        tagId: 1,
        tagName: '测试标签',
        coverageScore: 80,
        coverageValue: 0.7,
        discriminationScore: 85,
        discriminationIv: 0.5,
        stabilityScore: 90,
        stabilityPsi: 0.1,
        businessValueScore: 88,
        businessValueRoi: 6.0,
        recommendation: '优先使用',
        insights: ['覆盖良好', '区分度强'],
      };

      const mockTagScore = {
        id: 1,
        ...dto,
        overallScore: 85.5,
        level: 'S',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(scoreRepo, 'create').mockReturnValue(mockTagScore as any);
      jest.spyOn(scoreRepo, 'save').mockResolvedValue(mockTagScore as any);

      const result = await service.updateTagScores(dto);

      expect(result.id).toBe(1);
      expect(result.overallScore).toBeGreaterThan(80);
      expect(scoreRepo.create).toHaveBeenCalled();
      expect(scoreRepo.save).toHaveBeenCalledWith(mockTagScore);
    });
  });

  describe('getScores', () => {
    it('should return paginated scores with filters', async () => {
      const options: GetScoresDto = {
        page: 1,
        limit: 20,
        minScore: 70,
        level: 'S',
      };

      const mockScores = [{
        id: 1,
        tagName: '标签 1',
        overallScore: 85,
        level: 'S',
      }];

      jest.spyOn(scoreRepo, 'findAndCount').mockResolvedValue([mockScores as any, 1]);

      const result = await service.getScores(options);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should handle empty results', async () => {
      const options: GetScoresDto = { page: 1, limit: 20 };

      jest.spyOn(scoreRepo, 'findAndCount').mockResolvedValue([[], 0]);

      const result = await service.getScores(options);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('cache operations', () => {
    it('should cache tag scores', async () => {
      const mockScores = [{ id: 1, tagName: '标签 1', overallScore: 85 }];

      jest.spyOn(cacheService, 'set').mockResolvedValue();

      await (service as any).cacheTagScores(mockScores);

      expect(cacheService.set).toHaveBeenCalledWith(
        'tag_scores:all',
        mockScores,
        expect.any(Number)
      );
    });

    it('should clear tag scores cache', async () => {
      jest.spyOn(cacheService, 'delete').mockResolvedValue();

      await (service as any).clearTagScoresCache();

      expect(cacheService.delete).toHaveBeenCalledWith('tag_scores:all');
    });
  });
});
