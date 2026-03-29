import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationSeedService } from './recommendation-seed.service';
import { TagRecommendation } from '../entities/tag-recommendation.entity';

describe('RecommendationSeedService', () => {
  let service: RecommendationSeedService;
  let recommendationRepo: Repository<TagRecommendation>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationSeedService,
        {
          provide: getRepositoryToken(TagRecommendation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            clear: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationSeedService>(RecommendationSeedService);
    recommendationRepo = module.get<Repository<TagRecommendation>>(getRepositoryToken(TagRecommendation));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTestData', () => {
    it('should generate test data with default count', async () => {
      const mockCreated = { id: 1, customerId: 1, tagName: '高价值客户' };
      const mockSaved = [mockCreated];

      jest.spyOn(recommendationRepo, 'create').mockReturnValue(mockCreated as any);
      jest.spyOn(recommendationRepo, 'save').mockResolvedValue(mockSaved as any);

      const result = await service.generateTestData(20);

      expect(result).toHaveLength(1);
      expect(recommendationRepo.save).toHaveBeenCalled();
      expect(recommendationRepo.create).toHaveBeenCalled();
    });

    it('should generate test data with custom count', async () => {
      const mockCreated = { id: 1, customerId: 1, tagName: '测试标签' };
      const mockSaved = [mockCreated];

      jest.spyOn(recommendationRepo, 'create').mockReturnValue(mockCreated as any);
      jest.spyOn(recommendationRepo, 'save').mockResolvedValue(mockSaved as any);

      const result = await service.generateTestData(50);

      expect(result).toHaveLength(1);
      expect(recommendationRepo.create).toHaveBeenCalledTimes(50);
    });

    it('should generate data with correct structure', async () => {
      const mockCreated = { 
        id: 1, 
        customerId: 1, 
        tagName: '高价值客户',
        tagCategory: '客户价值',
        confidence: 0.8,
        source: 'rule' as const,
      };
      const mockSaved = [mockCreated];

      jest.spyOn(recommendationRepo, 'create').mockReturnValue(mockCreated as any);
      jest.spyOn(recommendationRepo, 'save').mockResolvedValue(mockSaved as any);

      const result = await service.generateTestData(1);

      expect(result[0]).toHaveProperty('customerId');
      expect(result[0]).toHaveProperty('tagName');
      expect(result[0]).toHaveProperty('tagCategory');
      expect(result[0]).toHaveProperty('confidence');
      expect(result[0]).toHaveProperty('source');
    });
  });

  describe('clearTestData', () => {
    it('should clear all test data', async () => {
      jest.spyOn(recommendationRepo, 'clear').mockResolvedValue(undefined);

      await service.clearTestData();

      expect(recommendationRepo.clear).toHaveBeenCalled();
    });
  });
});
