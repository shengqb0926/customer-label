import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Clustering Manager E2E', () => {
  let app: INestApplication;
  let createdConfigId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/clustering (POST)', () => {
    it('should create k-means clustering config', async () => {
      const createDto = {
        configName: '客户分群配置',
        algorithm: 'k-means',
        parameters: {
          k: 5,
          maxIterations: 100,
          convergenceThreshold: 0.001,
        },
        featureWeights: {
          assets: 0.4,
          income: 0.3,
          age: 0.3,
        },
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/clustering')
        .send(createDto)
        .expect(201);

      expect(response.body.configName).toBe(createDto.configName);
      expect(response.body.algorithm).toBe('k-means');
      expect(response.body.parameters.k).toBe(5);
      expect(response.body.isActive).toBe(true);
      expect(response.body.id).toBeDefined();

      createdConfigId = parseInt(response.body.id);
    });

    it('should create dbscan clustering config', async () => {
      const createDto = {
        configName: 'DBSCAN 分群配置',
        algorithm: 'dbscan',
        parameters: {
          eps: 0.5,
          minPoints: 5,
        },
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/clustering')
        .send(createDto)
        .expect(201);

      expect(response.body.algorithm).toBe('dbscan');
    });

    it('should fail to create config with duplicate name', async () => {
      const createDto = {
        configName: '客户分群配置',
        algorithm: 'k-means',
        parameters: { k: 3 },
      };

      return request(app.getHttpServer())
        .post('/clustering')
        .send(createDto)
        .expect(400);
    });

    it('should fail with invalid algorithm', async () => {
      const createDto = {
        configName: '无效算法配置',
        algorithm: 'invalid-algorithm',
        parameters: {},
      };

      return request(app.getHttpServer())
        .post('/clustering')
        .send(createDto)
        .expect(400);
    });

    it('should fail k-means without required k parameter', async () => {
      const createDto = {
        configName: '缺少参数配置',
        algorithm: 'k-means',
        parameters: {
          maxIterations: 100,
        },
      };

      return request(app.getHttpServer())
        .post('/clustering')
        .send(createDto)
        .expect(400);
    });
  });

  describe('/clustering (GET)', () => {
    it('should get clustering configs list', async () => {
      const response = await request(app.getHttpServer())
        .get('/clustering')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/clustering?page=1&limit=5')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
    });

    it('should filter by algorithm', async () => {
      const response = await request(app.getHttpServer())
        .get('/clustering?algorithm=k-means')
        .expect(200);

      response.body.data.forEach((config: any) => {
        expect(config.algorithm).toBe('k-means');
      });
    });

    it('should filter by isActive status', async () => {
      const response = await request(app.getHttpServer())
        .get('/clustering?isActive=true')
        .expect(200);

      response.body.data.forEach((config: any) => {
        expect(config.isActive).toBe(true);
      });
    });
  });

  describe('/clustering/:id (GET)', () => {
    it('should get config by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clustering/${createdConfigId}`)
        .expect(200);

      expect(response.body.id).toBe(createdConfigId);
      expect(response.body.configName).toBe('客户分群配置');
      expect(response.body.algorithm).toBe('k-means');
    });

    it('should return 404 for non-existent config', async () => {
      return request(app.getHttpServer())
        .get('/clustering/999999')
        .expect(404);
    });
  });

  describe('/clustering/:id (PUT)', () => {
    it('should update config', async () => {
      const updateDto = {
        parameters: {
          k: 6,
          maxIterations: 150,
        },
        isActive: false,
      };

      const response = await request(app.getHttpServer())
        .put(`/clustering/${createdConfigId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.isActive).toBe(false);
      expect(response.body.parameters.k).toBe(6);
    });

    it('should fail to update with invalid algorithm', async () => {
      return request(app.getHttpServer())
        .put(`/clustering/${createdConfigId}`)
        .send({ algorithm: 'invalid' })
        .expect(400);
    });
  });

  describe('/clustering/:id/activate (POST)', () => {
    it('should activate config', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clustering/${createdConfigId}/activate`)
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });

  describe('/clustering/:id/deactivate (POST)', () => {
    it('should deactivate config', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clustering/${createdConfigId}/deactivate`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });
  });

  describe('/clustering/:id/run (POST)', () => {
    it('should run clustering analysis', async () => {
      // First activate the config
      await request(app.getHttpServer())
        .post(`/clustering/${createdConfigId}/activate`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .post(`/clustering/${createdConfigId}/run`)
        .send({
          customerIds: [1, 2, 3, 4, 5],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.clusterCount).toBeDefined();
      expect(response.body.executionTime).toBeDefined();
    });

    it('should fail to run inactive config', async () => {
      // First deactivate the config
      await request(app.getHttpServer())
        .post(`/clustering/${createdConfigId}/deactivate`)
        .expect(200);

      return request(app.getHttpServer())
        .post(`/clustering/${createdConfigId}/run`)
        .expect(400);
    });
  });

  describe('/clustering/:id/stats (GET)', () => {
    it('should get clustering stats after running', async () => {
      // Run clustering first
      await request(app.getHttpServer())
        .post(`/clustering/${createdConfigId}/activate`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/clustering/${createdConfigId}/run`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/clustering/${createdConfigId}/stats`)
        .expect(200);

      expect(response.body.configName).toBe('客户分群配置');
      expect(response.body.algorithm).toBe('k-means');
      expect(response.body.clusterCount).toBeDefined();
      expect(response.body.lastRunAt).toBeDefined();
      expect(response.body.isActive).toBe(true);
    });

    it('should return null for config that never ran', async () => {
      // Create a new config but don't run it
      const createResponse = await request(app.getHttpServer())
        .post('/clustering')
        .send({
          configName: '未运行配置',
          algorithm: 'k-means',
          parameters: { k: 3 },
        })
        .expect(201);

      const newConfigId = parseInt(createResponse.body.id);

      const response = await request(app.getHttpServer())
        .get(`/clustering/${newConfigId}/stats`)
        .expect(404);
    });
  });

  describe('/clustering/:id (DELETE)', () => {
    it('should delete config', async () => {
      // First create a config to delete
      const createResponse = await request(app.getHttpServer())
        .post('/clustering')
        .send({
          configName: '待删除配置',
          algorithm: 'k-means',
          parameters: { k: 2 },
        })
        .expect(201);

      const configIdToDelete = parseInt(createResponse.body.id);

      // Delete the config
      await request(app.getHttpServer())
        .delete(`/clustering/${configIdToDelete}`)
        .expect(200);

      // Verify deletion
      return request(app.getHttpServer())
        .get(`/clustering/${configIdToDelete}`)
        .expect(404);
    });
  });
});
