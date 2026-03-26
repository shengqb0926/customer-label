import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagScore } from './entities/tag-score.entity';
import { ScoringService } from './scoring.service';
import { CacheService } from '../../infrastructure/redis';

describe('ScoringService', () => {
  let scoringService: ScoringService;
  let scoreRepo: Repository<TagScore>;
  let cacheService: CacheService;

  const mockScoreRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        {
          provide: getRepositoryToken(TagScore),
          useValue: mockScoreRepo,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    scoringService = module.get<ScoringService>(ScoringService);
    scoreRepo = module.get<Repository<TagScore>>(getRepositoryToken(TagScore));
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(scoringService).toBeDefined();
  });

  describe('calculateOverallScore', () => {
    it('should calculate weighted average correctly', () => {
      const scores = {
        coverageScore: 0.8,
        discriminationScore: 0.9,
        stabilityScore: 0.7,
        businessValueScore: 0.85,
      };

      const result = scoringService.calculateOverallScore(scores);

      // 权重：coverage=0.2, discrimination=0.3, stability=0.2, businessValue=0.3
      const expected = 0.8 * 0.2 + 0.9 * 0.3 + 0.7 * 0.2 + 0.85 * 0.3;
      expect(result).toBeCloseTo(expected, 4);
    });

    it('should handle zero scores', () => {
      const scores = {
        coverageScore: 0,
        discriminationScore: 0,
        stabilityScore: 0,
        businessValueScore: 0,
      };

      const result = scoringService.calculateOverallScore(scores);
      expect(result).toBe(0);
    });

    it('should handle perfect scores', () => {
      const scores = {
        coverageScore: 1,
        discriminationScore: 1,
        stabilityScore: 1,
        businessValueScore: 1,
      };

      const result = scoringService.calculateOverallScore(scores);
      expect(result).toBe(1);
    });
  });

  describe('determineRecommendation', () => {
    it('should return "强烈推荐" for score >= 0.85', () => {
      expect(scoringService.determineRecommendation(0.85)).toBe('强烈推荐');
      expect(scoringService.determineRecommendation(0.9)).toBe('强烈推荐');
      expect(scoringService.determineRecommendation(1)).toBe('强烈推荐');
    });

    it('should return "推荐" for score >= 0.75 and < 0.85', () => {
      expect(scoringService.determineRecommendation(0.75)).toBe('推荐');
      expect(scoringService.determineRecommendation(0.8)).toBe('推荐');
    });

    it('should return "中性" for score >= 0.65 and < 0.75', () => {
      expect(scoringService.determineRecommendation(0.65)).toBe('中性');
      expect(scoringService.determineRecommendation(0.7)).toBe('中性');
    });

    it('should return "不推荐" for score >= 0.5 and < 0.65', () => {
      expect(scoringService.determineRecommendation(0.5)).toBe('不推荐');
      expect(scoringService.determineRecommendation(0.6)).toBe('不推荐');
    });

    it('should return "禁用" for score < 0.5', () => {
      expect(scoringService.determineRecommendation(0.49)).toBe('禁用');
      expect(scoringService.determineRecommendation(0)).toBe('禁用');
    });
  });

  describe('getTagScore', () => {
    const mockTagScore: Partial<TagScore> = {
      tagId: 1,
      tagName: 'Test Tag',
      overallScore: 0.85,
    };

    it('should return cached score if available', async () => {
      mockCacheService.get.mockResolvedValue(mockTagScore);

      const result = await scoringService.getTagScore(1);

      expect(result).toEqual(mockTagScore);
      expect(cacheService.get).toHaveBeenCalledWith('tag:score:1');
      expect(scoreRepo.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database if not in cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockScoreRepo.findOne.mockResolvedValue(mockTagScore);

      const result = await scoringService.getTagScore(1);

      expect(result).toEqual(mockTagScore);
      expect(cacheService.get).toHaveBeenCalledWith('tag:score:1');
      expect(scoreRepo.findOne).toHaveBeenCalledWith({ where: { tagId: 1 } });
    });

    it('should cache the score after fetching from database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockScoreRepo.findOne.mockResolvedValue(mockTagScore);

      await scoringService.getTagScore(1);

      expect(cacheService.set).toHaveBeenCalledWith('tag:score:1', mockTagScore, 1800);
    });

    it('should return null if not found in database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockScoreRepo.findOne.mockResolvedValue(null);

      const result = await scoringService.getTagScore(999);

      expect(result).toBeNull();
    });
  });

  describe('updateTagScore', () => {
    const mockDto = {
      tagId: 1,
      tagName: 'Test Tag',
      coverageScore: 0.8,
      coverageValue: 0.5,
      discriminationScore: 0.9,
      discriminationIv: 0.3,
      stabilityScore: 0.7,
      stabilityPsi: 0.1,
      businessValueScore: 0.85,
      businessValueRoi: 2.5,
    };

    const mockSavedScore = {
      ...mockDto,
      overallScore: 0.825,
      recommendation: '推荐',
      id: 1,
    };

    it('should create new score if not exists', async () => {
      mockScoreRepo.findOne.mockResolvedValue(null);
      mockScoreRepo.create.mockReturnValue(mockSavedScore);
      mockScoreRepo.save.mockResolvedValue(mockSavedScore);

      const result = await scoringService.updateTagScore(mockDto as any);

      expect(result).toEqual(mockSavedScore);
      expect(mockScoreRepo.create).toHaveBeenCalled();
      expect(mockScoreRepo.save).toHaveBeenCalled();
    });

    it('should update existing score', async () => {
      const existingScore = { ...mockSavedScore, overallScore: 0.7 };
      mockScoreRepo.findOne.mockResolvedValue(existingScore);
      mockScoreRepo.save.mockResolvedValue(mockSavedScore);

      await scoringService.updateTagScore(mockDto as any);

      expect(mockScoreRepo.save).toHaveBeenCalled();
    });

    it('should cache the updated score', async () => {
      mockScoreRepo.findOne.mockResolvedValue(null);
      mockScoreRepo.create.mockReturnValue(mockSavedScore);
      mockScoreRepo.save.mockResolvedValue(mockSavedScore);

      await scoringService.updateTagScore(mockDto as any);

      expect(cacheService.set).toHaveBeenCalledWith('tag:score:1', mockSavedScore, 1800);
    });
  });
});
