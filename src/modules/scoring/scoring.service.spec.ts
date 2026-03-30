import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationLevel } from './dto/get-scores.dto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoringService, UpdateTagScoreDto } from './scoring.service';
import { TagScore } from './entities/tag-score.entity';
import { CacheService } from '../../infrastructure/redis';

describe('ScoringService', () => {
  let service: ScoringService;
  let scoreRepo: Repository<TagScore>;
  let cache: CacheService;

  const mockTagScore: Partial<TagScore> = {
    tagId: 1,
    tagName: '测试标签',
    coverageScore: 80,
    coverageValue: 0.75,
    discriminationScore: 85,
    discriminationIv: 0.3,
    stabilityScore: 90,
    stabilityPsi: 0.05,
    businessValueScore: 88,
    businessValueRoi: 2.5,
    overallScore: 85.5,
    recommendation: RecommendationLevel.RECOMMENDED as any,
    insights: ['高覆盖率', '稳定性好'],
    lastCalculatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        {
          provide: getRepositoryToken(TagScore),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScoringService>(ScoringService);
    scoreRepo = module.get<Repository<TagScore>>(getRepositoryToken(TagScore));
    cache = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateOverallScore', () => {
    it('should calculate weighted average correctly', () => {
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

    it('should return score with 4 decimal places', () => {
      const scores = {
        coverageScore: 66.66,
        discriminationScore: 77.77,
        stabilityScore: 88.88,
        businessValueScore: 99.99,
      };

      const result = service.calculateOverallScore(scores);
      
      const decimalPart = result.toString().split('.')[1];
      expect(decimalPart?.length).toBeLessThanOrEqual(4);
    });
  });

  describe('determineRecommendation', () => {
    it('should return 强烈推荐 for score >= 85', () => {
      expect(service.determineRecommendation(85)).toBe('强烈推荐');
      expect(service.determineRecommendation(90)).toBe('强烈推荐');
      expect(service.determineRecommendation(100)).toBe('强烈推荐');
    });

    it('should return 推荐 for score between 75 and 85', () => {
      expect(service.determineRecommendation(75)).toBe('推荐');
      expect(service.determineRecommendation(80)).toBe('推荐');
      expect(service.determineRecommendation(84)).toBe('推荐');
    });

    it('should return 中性 for score between 65 and 75', () => {
      expect(service.determineRecommendation(65)).toBe('中性');
      expect(service.determineRecommendation(70)).toBe('中性');
      expect(service.determineRecommendation(74)).toBe('中性');
    });

    it('should return 不推荐 for score between 50 and 65', () => {
      expect(service.determineRecommendation(50)).toBe('不推荐');
      expect(service.determineRecommendation(60)).toBe('不推荐');
      expect(service.determineRecommendation(64)).toBe('不推荐');
    });

    it('should return 禁用 for score < 50', () => {
      expect(service.determineRecommendation(49)).toBe('禁用');
      expect(service.determineRecommendation(30)).toBe('禁用');
      expect(service.determineRecommendation(0)).toBe('禁用');
    });
  });

  describe('getByRecommendation', () => {
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

      const result = service.getByRecommendation(dto as any);

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

      const result = service.getByRecommendation(dto as any);

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

      const result = service.getByRecommendation(dto as any);

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

      const result = service.getByRecommendation(dto as any);

      expect(result.recommendation).toContain('推广');
      expect(result.recommendation).toContain('应用');
    });
  });

  describe('updateTagScore', () => {
    const updateDto: UpdateTagScoreDto = {
      tagId: 1,
      tagName: '更新标签',
      coverageScore: 85,
      coverageValue: 0.8,
      discriminationScore: 90,
      discriminationIv: 0.35,
      stabilityScore: 88,
      stabilityPsi: 0.04,
      businessValueScore: 92,
      businessValueRoi: 3.0,
    };

    it('should create new tag score if not exists', async () => {
      jest.spyOn(scoreRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(scoreRepo, 'create').mockReturnValue(mockTagScore as any);
      jest.spyOn(scoreRepo, 'save').mockResolvedValue(mockTagScore as any);
      jest.spyOn(cache, 'set').mockResolvedValue();

      const result = await service.updateTagScore(updateDto);

      expect(result).toEqual(mockTagScore);
      expect(scoreRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        ...updateDto,
        overallScore: expect.any(Number),
        recommendation: expect.any(String),
      }));
      expect(cache.set).toHaveBeenCalledWith(`tag:score:${updateDto.tagId}`, mockTagScore, 1800);
    });

    it('should update existing tag score', async () => {
      jest.spyOn(scoreRepo, 'findOne').mockResolvedValue(mockTagScore as any);
      jest.spyOn(scoreRepo, 'save').mockResolvedValue(mockTagScore as any);
      jest.spyOn(cache, 'set').mockResolvedValue();

      const result = await service.updateTagScore(updateDto);

      expect(scoreRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        overallScore: expect.any(Number),
        lastCalculatedAt: expect.any(Date),
      }));
      expect(cache.set).toHaveBeenCalled();
    });

    it('should use custom recommendation if provided', async () => {
      const dtoWithRecommendation = {
        ...updateDto,
        recommendation: '自定义推荐',
      };

      jest.spyOn(scoreRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(scoreRepo, 'create').mockReturnValue(mockTagScore as any);
      jest.spyOn(scoreRepo, 'save').mockResolvedValue(mockTagScore as any);
      jest.spyOn(cache, 'set').mockResolvedValue();

      await service.updateTagScore(dtoWithRecommendation);

      expect(scoreRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        recommendation: '自定义推荐',
      }));
    });
  });

  describe('batchUpdateScores', () => {
    it('should batch update multiple tag scores', async () => {
      const scores: UpdateTagScoreDto[] = [
        { tagId: 1, tagName: '标签 1', coverageScore: 80, coverageValue: 0.7, discriminationScore: 85, discriminationIv: 0.3, stabilityScore: 90, stabilityPsi: 0.05, businessValueScore: 88, businessValueRoi: 2.5 },
        { tagId: 2, tagName: '标签 2', coverageScore: 75, coverageValue: 0.65, discriminationScore: 80, discriminationIv: 0.28, stabilityScore: 85, stabilityPsi: 0.06, businessValueScore: 82, businessValueRoi: 2.2 },
      ];

      jest.spyOn(scoreRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(scoreRepo, 'create').mockImplementation((dto) => ({ ...dto, overallScore: 85 } as any));
      jest.spyOn(scoreRepo, 'save').mockImplementation(async (entity) => entity as any);
      jest.spyOn(cache, 'set').mockResolvedValue();

      const result = await service.batchUpdateScores(scores);

      expect(result).toHaveLength(2);
      expect(result[0].tagName).toBe('标签 1');
      expect(result[1].tagName).toBe('标签 2');
    });
  });

  describe('getTagScore', () => {
    it('should return cached tag score if available', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(mockTagScore as any);

      const result = await service.getTagScore(1);

      expect(result).toEqual(mockTagScore);
      expect(cache.get).toHaveBeenCalledWith('tag:score:1');
      expect(scoreRepo.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database if not in cache', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(scoreRepo, 'findOne').mockResolvedValue(mockTagScore as any);
      jest.spyOn(cache, 'set').mockResolvedValue();

      const result = await service.getTagScore(1);

      expect(result).toEqual(mockTagScore);
      expect(scoreRepo.findOne).toHaveBeenCalledWith({ where: { tagId: 1 } });
      expect(cache.set).toHaveBeenCalledWith('tag:score:1', mockTagScore, expect.any(Number));
    });

    it('should return null if tag score not found', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(scoreRepo, 'findOne').mockResolvedValue(null);

      const result = await service.getTagScore(999);

      expect(result).toBeNull();
    });
  });

  describe('getAllScores', () => {
    it('should return all tag scores sorted by overallScore', async () => {
      const mockScores = [
        { ...mockTagScore, tagId: 1, overallScore: 85 },
        { ...mockTagScore, tagId: 2, overallScore: 92 },
        { ...mockTagScore, tagId: 3, overallScore: 78 },
      ];

      jest.spyOn(scoreRepo, 'find').mockResolvedValue(mockScores as any);

      const result = await service.getAllScores();

      expect(result).toHaveLength(3);
      expect(scoreRepo.find).toHaveBeenCalledWith({
        order: { overallScore: 'DESC' },
      });
    });
  });

  describe('findAllWithPagination', () => {
    const mockScores = [
      { ...mockTagScore, tagId: 1, overallScore: 85 },
      { ...mockTagScore, tagId: 2, overallScore: 92 },
    ];

    it('should return paginated tag scores', async () => {
      jest.spyOn(scoreRepo, 'findAndCount').mockResolvedValue([mockScores as any, 2]);

      const result = await service.findAllWithPagination({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by tagName', async () => {
      jest.spyOn(scoreRepo, 'findAndCount').mockResolvedValue([mockScores as any, 2]);

      await service.findAllWithPagination({ tagName: '测试' });

      expect(scoreRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          tagName: expect.stringContaining('测试'),
        }),
      }));
    });

    it('should filter by recommendation', async () => {
      jest.spyOn(scoreRepo, 'findAndCount').mockResolvedValue([mockScores as any, 2]);

      await service.findAllWithPagination({ recommendation: RecommendationLevel.RECOMMENDED });

      expect(scoreRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          recommendation: RecommendationLevel.RECOMMENDED,
        }),
      }));
    });

    it('should filter by score range', async () => {
      jest.spyOn(scoreRepo, 'findAndCount').mockResolvedValue([mockScores as any, 2]);

      await service.findAllWithPagination({ minScore: 80, maxScore: 95 });

      expect(scoreRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          overallScore: expect.objectContaining({
            '>=': 80,
            '<=': 95,
          }),
        }),
      }));
    });

    it('should apply sorting correctly', async () => {
      jest.spyOn(scoreRepo, 'findAndCount').mockResolvedValue([mockScores as any, 2]);

      await service.findAllWithPagination({ sortBy: 'overallScore', sortOrder: 'asc' });

      expect(scoreRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        order: expect.objectContaining({
          overallScore: 'ASC',
          tagId: 'ASC',
        }),
      }));
    });
  });

  describe('getByRecommendation', () => {
    it('should return tag scores filtered by recommendation', async () => {
      jest.spyOn(scoreRepo, 'find').mockResolvedValue([mockTagScore as any]);

      const result = await service.getByRecommendation('推荐');

      expect(result).toHaveLength(1);
      expect(scoreRepo.find).toHaveBeenCalledWith({
        where: { recommendation: RecommendationLevel.RECOMMENDED },
        order: { overallScore: 'DESC' },
      });
    });
  });

  describe('invalidateCache', () => {
    it('should clear cache for specific tag', async () => {
      jest.spyOn(cache, 'delete').mockResolvedValue();

      await service.invalidateCache(1);

      expect(cache.delete).toHaveBeenCalledWith('tag:score:1');
    });
  });

  describe('getStats', () => {
    it('should return statistics about tag scores', async () => {
      jest.spyOn(scoreRepo, 'count').mockResolvedValue(100);
      jest.spyOn(scoreRepo, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: 85.5 }),
      } as any);
      jest.spyOn(scoreRepo, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { recommendation: '强烈推荐', count: '30' },
          { recommendation: RecommendationLevel.RECOMMENDED, count: '50' },
          { recommendation: '中性', count: '20' },
        ]),
      } as any);

      const result = await service.getStats();

      expect(result.total).toBe(100);
      expect(result.avgOverallScore).toBe(85.5);
      expect(result.byRecommendation['强烈推荐']).toBe(30);
      expect(result.byRecommendation['推荐']).toBe(50);
    });

    it('should handle zero tags', async () => {
      jest.spyOn(scoreRepo, 'count').mockResolvedValue(0);
      jest.spyOn(scoreRepo, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: null }),
      } as any);
      jest.spyOn(scoreRepo, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.getStats();

      expect(result.total).toBe(0);
      expect(result.avgOverallScore).toBe(0);
      expect(result.byRecommendation).toEqual({});
    });
  });
});
