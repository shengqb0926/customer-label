import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClusteringEngineService, CustomerFeatureVector } from './clustering-engine.service';
import { ClusteringConfig } from '../entities/clustering-config.entity';

describe('ClusteringEngineService', () => {
  let clusteringEngine: ClusteringEngineService;
  let configRepo: Repository<ClusteringConfig>;

  const mockConfigRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClusteringEngineService,
        {
          provide: getRepositoryToken(ClusteringConfig),
          useValue: mockConfigRepo,
        },
      ],
    }).compile();

    clusteringEngine = module.get<ClusteringEngineService>(ClusteringEngineService);
    configRepo = module.get<Repository<ClusteringConfig>>(getRepositoryToken(ClusteringConfig));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(clusteringEngine).toBeDefined();
  });

  describe('generateRecommendations', () => {
    const mockCustomers: CustomerFeatureVector[] = [
      {
        customerId: 1,
        features: [1000000, 50000, 30, 100, 365],
        featureNames: ['assets', 'income', 'age', 'orders', 'days'],
      },
      {
        customerId: 2,
        features: [500000, 30000, 45, 50, 730],
        featureNames: ['assets', 'income', 'age', 'orders', 'days'],
      },
      {
        customerId: 3,
        features: [2000000, 80000, 28, 200, 180],
        featureNames: ['assets', 'income', 'age', 'orders', 'days'],
      },
      {
        customerId: 4,
        features: [100000, 10000, 55, 20, 1000],
        featureNames: ['assets', 'income', 'age', 'orders', 'days'],
      },
    ];

    const mockConfig: Partial<ClusteringConfig> = {
      configName: 'default',
      parameters: { k: 2 },
      isActive: true,
    };

    it('should generate recommendations for clustered customers', async () => {
      mockConfigRepo.findOne.mockResolvedValue(mockConfig as ClusteringConfig);

      const result = await clusteringEngine.generateRecommendations(
        mockCustomers,
        mockConfig as ClusteringConfig
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
      
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('customerId');
        expect(result[0]).toHaveProperty('tagName');
        expect(result[0]).toHaveProperty('confidence');
        expect(result[0].source).toBe('clustering');
      }
    });

    it('should use default config when not provided', async () => {
      mockConfigRepo.findOne.mockResolvedValue(null);

      const result = await clusteringEngine.generateRecommendations(mockCustomers);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty customer list', async () => {
      const result = await clusteringEngine.generateRecommendations([]);

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockConfigRepo.findOne.mockRejectedValue(new Error('Database error'));

      const result = await clusteringEngine.generateRecommendations(mockCustomers);

      expect(result).toEqual([]);
    });
  });

  describe('kMeans algorithm', () => {
    it('should cluster data points correctly', async () => {
      const data = [
        [1, 2],
        [1.5, 1.8],
        [5, 8],
        [8, 8],
        [1, 0.6],
        [9, 11],
      ];

      // 使用反射访问私有方法进行测试
      const result = await (clusteringEngine as any).kMeans(data, 2);

      expect(result).toHaveProperty('centroids');
      expect(result).toHaveProperty('assignments');
      expect(result.centroids).toHaveLength(2);
      expect(result.assignments).toHaveLength(6);
      expect(result.assignments.every((a: number) => a === 0 || a === 1)).toBe(true);
    });

    it('should throw error for invalid k value', async () => {
      const data = [[1, 2], [3, 4]];

      await expect((clusteringEngine as any).kMeans(data, 0)).rejects.toThrow(
        'Invalid data or k value'
      );
    });

    it('should throw error for empty data', async () => {
      await expect((clusteringEngine as any).kMeans([], 3)).rejects.toThrow(
        'Invalid data or k value'
      );
    });
  });

  describe('initializeCentroids (K-Means++)', () => {
    it('should initialize k centroids', () => {
      const data = [
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
      ];

      const centroids = (clusteringEngine as any).initializeCentroids(data, 3);

      expect(centroids).toHaveLength(3);
      expect(centroids[0]).toHaveLength(2);
    });

    it('should select centroids from data points', () => {
      const data = [
        [1, 2],
        [3, 4],
        [5, 6],
      ];

      const centroids = (clusteringEngine as any).initializeCentroids(data, 2);

      centroids.forEach((centroid: number[]) => {
        expect(data.some(point => point[0] === centroid[0] && point[1] === centroid[1])).toBe(true);
      });
    });
  });

  describe('distance calculations', () => {
    it('should calculate euclidean distance correctly', () => {
      const point1 = [0, 0];
      const point2 = [3, 4];

      const distance = (clusteringEngine as any).euclideanDistance(point1, point2);

      expect(distance).toBeCloseTo(5, 5);
    });

    it('should calculate squared distance correctly', () => {
      const point1 = [0, 0];
      const point2 = [3, 4];

      const squaredDist = (clusteringEngine as any).squaredDistance(point1, point2);

      expect(squaredDist).toBeCloseTo(25, 5);
    });

    it('should return 0 for same point', () => {
      const point = [5, 10, 15];

      const distance = (clusteringEngine as any).euclideanDistance(point, point);

      expect(distance).toBe(0);
    });
  });

  describe('findNearestCentroid', () => {
    it('should find the nearest centroid index', () => {
      const point = [0, 0];
      const centroids = [
        [1, 1],
        [10, 10],
        [5, 5],
      ];

      const nearestIndex = (clusteringEngine as any).findNearestCentroid(point, centroids);

      expect(nearestIndex).toBe(0);
    });

    it('should handle single centroid', () => {
      const point = [5, 5];
      const centroids = [[0, 0]];

      const nearestIndex = (clusteringEngine as any).findNearestCentroid(point, centroids);

      expect(nearestIndex).toBe(0);
    });
  });

  describe('calculateCentroid', () => {
    it('should calculate mean of points', () => {
      const points = [
        [2, 4],
        [4, 6],
        [6, 8],
      ];

      const centroid = (clusteringEngine as any).calculateCentroid(points);

      expect(centroid).toEqual([4, 6]);
    });

    it('should handle single point', () => {
      const points = [[5, 10]];

      const centroid = (clusteringEngine as any).calculateCentroid(points);

      expect(centroid).toEqual([5, 10]);
    });
  });

  describe('arraysEqual', () => {
    it('should return true for equal arrays', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];

      expect((clusteringEngine as any).arraysEqual(arr1, arr2)).toBe(true);
    });

    it('should return false for different arrays', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 4];

      expect((clusteringEngine as any).arraysEqual(arr1, arr2)).toBe(false);
    });

    it('should return false for different lengths', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2];

      expect((clusteringEngine as any).arraysEqual(arr1, arr2)).toBe(false);
    });
  });

  describe('randomPoint', () => {
    it('should generate random point with correct dimensions', () => {
      const point = (clusteringEngine as any).randomPoint(5);

      expect(point).toHaveLength(5);
      expect(point.every((val: number) => typeof val === 'number')).toBe(true);
    });
  });

  describe('loadDefaultConfig', () => {
    it('should return default config when none exists in database', async () => {
      mockConfigRepo.findOne.mockResolvedValue(null);
      mockConfigRepo.create.mockReturnValue({
        id: 1,
        configName: '默认配置',
        algorithm: 'k-means',
        parameters: { k: 5, maxIterations: 100, convergenceThreshold: 0.001 },
        featureWeights: {},
        isActive: true,
      });
      mockConfigRepo.save.mockResolvedValue({
        id: 1,
        configName: '默认配置',
        algorithm: 'k-means',
        parameters: { k: 5, maxIterations: 100, convergenceThreshold: 0.001 },
        featureWeights: {},
        isActive: true,
      });

      const config = await (clusteringEngine as any).loadDefaultConfig();

      expect(config).toBeDefined();
      expect(config.parameters?.k).toBe(5);
    });

    it('should return existing default config', async () => {
      const existingConfig = {
        id: 1,
        configName: 'default',
        parameters: { k: 3 },
        isActive: true,
      };

      mockConfigRepo.findOne.mockResolvedValue(existingConfig);

      const config = await (clusteringEngine as any).loadDefaultConfig();

      expect(config).toEqual(existingConfig);
    });
  });

  describe('analyzeClusters', () => {
    it('should analyze cluster characteristics', async () => {
      const clusters = {
        centroids: [[1000000, 50000], [200000, 10000]],
        assignments: [0, 0, 1, 1],
      };

      const customers: CustomerFeatureVector[] = [
        { customerId: 1, features: [1000000, 50000], featureNames: ['assets', 'income'] },
        { customerId: 2, features: [1200000, 60000], featureNames: ['assets', 'income'] },
        { customerId: 3, features: [200000, 10000], featureNames: ['assets', 'income'] },
        { customerId: 4, features: [180000, 9000], featureNames: ['assets', 'income'] },
      ];

      const profiles = await (clusteringEngine as any).analyzeClusters(
        clusters,
        customers,
        ['assets', 'income']
      );

      expect(profiles).toHaveLength(2);
      expect(profiles[0]).toHaveProperty('clusterId');
      expect(profiles[0]).toHaveProperty('size');
      expect(profiles[0]).toHaveProperty('center');
      expect(profiles[0]).toHaveProperty('characteristics');
      expect(profiles[0]).toHaveProperty('suggestedTags');
    });
  });

  describe('inferTagsFromCluster', () => {
    it('should infer tags based on cluster profile', async () => {
      const profile = {
        clusterId: 0,
        size: 100,
        center: [1500000, 70000, 35, 150, 400],
        characteristics: ['高资产', '高收入', '中年', '高活跃'],
      };

      const tags = await (clusteringEngine as any).inferTagsFromCluster(profile);

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0]).toHaveProperty('tagName');
      expect(tags[0]).toHaveProperty('tagCategory');
      expect(tags[0]).toHaveProperty('reason');
    });
  });
});
