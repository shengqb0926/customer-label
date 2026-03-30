import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoringService } from './scoring.service';
import { TagScore } from './entities/tag-score.entity';
import { CacheService } from '../../infrastructure/redis';

describe('ScoringService', () => {
  let service: ScoringService;
  let scoreRepo: Repository<TagScore>;
  let cache: CacheService;

  const mockTagScore: Partial<TagScore> = {
    tagId: 1,
    tagName: '测试标签',
    coverageScore: 0.8,
    discriminationScore: 0.85,
    stabilityScore: 0.9,
    businessValueScore: 0.88,
    overallScore: 0.85,
    recommendation: '推荐' as any,
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
        coverageScore: 0.8,
        discriminationScore: 0.9,
        stabilityScore: 0.7,
        businessValueScore: 0.85,
      };

      const result = service.calculateOverallScore(scores);

      // 权重：coverage 0.2, discrimination 0.3, stability 0.2, businessValue 0.3
      const expected = 0.8 * 0.2 + 0.9 * 0.3 + 0.7 * 0.2 + 0.85 * 0.3;
      expect(result).toBeCloseTo(expected, 4);
    });

    it('should return score with 4 decimal places', () => {
      const scores = {
        coverageScore: 0.6666,
        discriminationScore: 0.7777,
        stabilityScore: 0.8888,
        businessValueScore: 0.9999,
      };

      const result = service.calculateOverallScore(scores);
      
      expect(result.toString().split('.')[1]?.length).toBeLessThanOrEqual(4);
    });
  });

  describe('determineRecommendation', () => {
    it('should return 强烈推荐 for score >= 0.85', () => {
      expect(service.determineRecommendation(0.85)).toBe('强烈推荐');
      expect(service.determineRecommendation(0.9)).toBe('强烈推荐');
    });

    it('should return 推荐 for score between 0.75 and 0.85', () => {
      expect(service.determineRecommendation(0.75)).toBe('推荐');
      expect(service.determineRecommendation(0.8)).toBe('推荐');
    });

    it('should return 中性 for score between 0.65 and 0.75', () => {
      expect(service.determineRecommendation(0.65)).toBe('中性');
      expect(service.determineRecommendation(0.7)).toBe('中性');
    });

    it('should return 不推荐 for score between 0.5 and 0.65', () => {
      expect(service.determineRecommendation(0.5)).toBe('不推荐');
      expect(service.determineRecommendation(0.6)).toBe('不推荐');
    });

    it('should return 禁用 for score < 0.5', () => {
      expect(service.determineRecommendation(0.49)).toBe('禁用');
      expect(service.determineRecommendation(0.3)).toBe('禁用');
    });
  });

  describe('getTagScore', () => {
    it('should return cached tag score if available', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(mockTagScore as any);

      const result = await service.getTagScore(1);

      expect(result).toEqual(mockTagScore);
      expect(cache.get).toHaveBeenCalledWith('tag:score:1');
    });

    it('should fetch from database if not in cache', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(scoreRepo, 'findOne').mockResolvedValue(mockTagScore as any);
      jest.spyOn(cache, 'set').mockResolvedValue();

      const result = await service.getTagScore(1);

      expect(result).toEqual(mockTagScore);
      expect(scoreRepo.findOne).toHaveBeenCalledWith({ where: { tagId: 1 } });
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
        { ...mockTagScore, tagId: 1, overallScore: 0.85 },
        { ...mockTagScore, tagId: 2, overallScore: 0.92 },
      ];

      jest.spyOn(scoreRepo, 'find').mockResolvedValue(mockScores as any);

      const result = await service.getAllScores();

      expect(result).toHaveLength(2);
      expect(scoreRepo.find).toHaveBeenCalledWith({
        order: { overallScore: 'DESC' },
      });
    });
  });

  describe('getByRecommendation', () => {
    it('should return tag scores filtered by recommendation', async () => {
      jest.spyOn(scoreRepo, 'find').mockResolvedValue([mockTagScore as any]);

      const result = await service.getByRecommendation('推荐');

      expect(result).toHaveLength(1);
      expect(scoreRepo.find).toHaveBeenCalledWith({
        where: { recommendation: '推荐' },
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
});
