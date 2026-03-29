import { Test, TestingModule } from '@nestjs/testing';
import { AssociationEngineService } from './association-engine.service';
import { CreateRecommendationDto } from '../entities/tag-recommendation.entity';

describe('AssociationEngineService', () => {
  let associationEngine: AssociationEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssociationEngineService],
    }).compile();

    associationEngine = module.get<AssociationEngineService>(AssociationEngineService);
  });

  it('should be defined', () => {
    expect(associationEngine).toBeDefined();
  });

  describe('generateRecommendations', () => {
    it('should return empty array when customer has no existing tags', async () => {
      const customerId = 1;
      const existingTags: string[] = [];
      const allCustomerTags = new Map<number, string[]>();

      const result = await associationEngine.generateRecommendations(
        customerId,
        existingTags,
        allCustomerTags
      );

      expect(result).toEqual([]);
    });

    it('should generate recommendations based on association rules', async () => {
      const customerId = 1;
      const existingTags = ['tag1', 'tag2'];
      const allCustomerTags = new Map<number, string[]>([
        [1, ['tag1', 'tag2', 'tag3']],
        [2, ['tag1', 'tag3']],
        [3, ['tag2', 'tag3']],
        [4, ['tag1', 'tag2']],
      ]);

      const result = await associationEngine.generateRecommendations(
        customerId,
        existingTags,
        allCustomerTags
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty allCustomerTags', async () => {
      const customerId = 1;
      const existingTags = ['tag1'];
      const allCustomerTags = new Map<number, string[]>();

      const result = await associationEngine.generateRecommendations(
        customerId,
        existingTags,
        allCustomerTags
      );

      expect(result).toEqual([]);
    });
  });
});
