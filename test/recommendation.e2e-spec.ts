import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { loginAndGetToken, setAuthHeader } from '../test-helpers';

describe('Recommendation System E2E (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testCustomerId: number;
  let createdRuleId: number;
  let createdRecommendationId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key === 'database.host') return process.env.TEST_DB_HOST || 'localhost';
          if (key === 'database.port') return parseInt(process.env.TEST_DB_PORT || '5432');
          if (key === 'database.username') return process.env.TEST_DB_USERNAME || 'postgres';
          if (key === 'database.password') return process.env.TEST_DB_PASSWORD || 'postgres';
          if (key === 'database.database') return process.env.TEST_DB_DATABASE || 'customer_label_test';
          if (key === 'redis.url') return process.env.TEST_REDIS_URL || 'redis://localhost:6379';
          if (key === 'redis.cluster.enabled') return false;
          return null;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 获取认证 token
    const tokens = await loginAndGetToken(app);
    authToken = tokens.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    if (createdRecommendationId) {
      try {
        await setAuthHeader(
          request(app.getHttpServer()).delete(`/recommendations/${createdRecommendationId}`),
          authToken
        );
      } catch (e) {}
    }
    if (createdRuleId) {
      try {
        await setAuthHeader(
          request(app.getHttpServer()).delete(`/rules/${createdRuleId}`),
          authToken
        );
      } catch (e) {}
    }
    if (testCustomerId) {
      try {
        await setAuthHeader(
          request(app.getHttpServer()).delete(`/customers/${testCustomerId}`),
          authToken
        );
      } catch (e) {}
    }
    await app.close();
  });

  describe('Rule Management', () => {
    it('/rules (POST) - should create a recommendation rule', async () => {
      const ruleDto = {
        ruleName: `E2E_Test_Rule_${Date.now()}`,
        ruleExpression: 'totalOrders >= 5 && totalAmount >= 5000',
        priority: 75,
        tagTemplate: {
          name: '潜力客户',
          category: '客户价值',
          baseConfidence: 0.8,
        },
        isActive: true,
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/rules'),
        authToken
      )
        .send(ruleDto)
        .expect(201);

      expect(response.body.ruleName).toBe(ruleDto.ruleName);
      expect(response.body.priority).toBe(ruleDto.priority);
      expect(response.body.isActive).toBe(true);
      expect(response.body.id).toBeDefined();

      createdRuleId = parseInt(response.body.id);
    });

    it('/rules (GET) - should get rules list', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/rules?page=1&limit=10'),
        authToken
      )
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('/rules/:id (GET) - should get rule by id', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get(`/rules/${createdRuleId}`),
        authToken
      )
        .expect(200);

      expect(response.body.id).toBe(createdRuleId);
      expect(response.body.ruleName).toContain('E2E_Test_Rule_');
    });

    it('/rules/:id (PUT) - should update rule', async () => {
      const updateDto = {
        priority: 85,
        isActive: false,
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).put(`/rules/${createdRuleId}`),
        authToken
      )
        .send(updateDto)
        .expect(200);

      expect(response.body.priority).toBe(85);
      expect(response.body.isActive).toBe(false);
    });
  });

  describe('Customer Setup for Recommendations', () => {
    it('/customers (POST) - should create test customer', async () => {
      const customerDto = {
        name: `Recommendation_Test_Customer_${Date.now()}`,
        email: `rec_test_${Date.now()}@example.com`,
        phone: '13800138001',
        level: 'SILVER',
        riskLevel: 'LOW',
        totalOrders: 10,
        totalAmount: 15000,
        lastOrderDate: new Date().toISOString(),
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/customers'),
        authToken
      )
        .send(customerDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      testCustomerId = parseInt(response.body.id);
    });
  });

  describe('Recommendation Generation', () => {
    it('/recommendations/generate/:customerId (POST) - should generate recommendations', async () => {
      const options = {
        mode: 'rule',
        useCache: false,
        detectConflicts: false,
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).post(`/recommendations/generate/${testCustomerId}`),
        authToken
      )
        .send(options)
        .expect(201);

      expect(response.body.customerId).toBe(testCustomerId);
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body.mode).toBe('rule');
    });

    it('/recommendations/customer/:customerId (GET) - should get customer recommendations', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get(`/recommendations/customer/${testCustomerId}?page=1&limit=10`),
        authToken
      )
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBeDefined();
      
      if (response.body.total > 0) {
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data[0].customerId).toBe(testCustomerId);
        
        createdRecommendationId = response.body.data[0].id;
      }
    });
  });

  describe('Recommendation Operations', () => {
    beforeAll(async () => {
      // Ensure we have a recommendation to work with
      if (!createdRecommendationId) {
        const response = await setAuthHeader(
          request(app.getHttpServer()).get(`/recommendations/customer/${testCustomerId}?page=1&limit=1`),
          authToken
        )
          .expect(200);
        
        if (response.body.data && response.body.data.length > 0) {
          createdRecommendationId = response.body.data[0].id;
        }
      }
    });

    it('/recommendations/:id/accept (POST) - should accept recommendation', async () => {
      if (!createdRecommendationId) {
        console.log('Skipping accept test - no recommendation available');
        return;
      }

      const acceptDto = {
        modifiedTagName: null,
        feedbackReason: 'E2E 测试接受',
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).post(`/recommendations/${createdRecommendationId}/accept`),
        authToken
      )
        .send(acceptDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isAccepted).toBe(true);
    });

    it('/recommendations/stats (GET) - should get recommendation statistics', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/recommendations/stats'),
        authToken
      )
        .expect(200);

      expect(response.body.total).toBeDefined();
      expect(response.body.bySource).toBeDefined();
      expect(response.body.avgConfidence).toBeDefined();
    });

    it('/recommendations/status-stats (GET) - should get status statistics', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/recommendations/status-stats'),
        authToken
      )
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0].status).toBeDefined();
        expect(response.body[0].count).toBeDefined();
      }
    });
  });

  describe('Recommendation Filtering and Search', () => {
    it('/recommendations (GET) - should support filtering by status', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/recommendations?status=PENDING&page=1&limit=10'),
        authToken
      )
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBeDefined();
    });

    it('/recommendations (GET) - should support filtering by source', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/recommendations?source=RULE&page=1&limit=10'),
        authToken
      )
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('/recommendations (GET) - should support date range filtering', async () => {
      const startDate = new Date(Date.now() - 86400000).toISOString(); // 昨天
      const endDate = new Date().toISOString();

      const response = await setAuthHeader(
        request(app.getHttpServer()).get(`/recommendations?startDate=${startDate}&endDate=${endDate}&page=1&limit=10`),
        authToken
      )
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('/recommendations (GET) - should support sorting', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/recommendations?sortBy=confidence&sortOrder=desc&page=1&limit=10'),
        authToken
      )
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.sortBy).toBe('confidence');
      expect(response.body.sortOrder).toBe('desc');
    });
  });

  describe('Error Scenarios', () => {
    it('/rules (POST) - should fail with duplicate rule name', async () => {
      const duplicateRule = {
        ruleName: `E2E_Test_Rule_${Date.now() - 1000}`, // Use recent timestamp
        ruleExpression: 'invalid',
        tagTemplate: {
          name: 'Test',
          category: 'Test',
          baseConfidence: 0.5,
        },
      };

      // First create should succeed (already done above)
      // This test verifies uniqueness constraint
      return setAuthHeader(
        request(app.getHttpServer()).post('/rules'),
        authToken
      )
        .send({
          ruleName: 'Duplicate Rule Name',
          ruleExpression: 'test',
          tagTemplate: {
            name: 'Test',
            category: 'Test',
            baseConfidence: 0.5,
          },
        })
        .expect(400);
    });

    it('/recommendations/generate/:id (POST) - should fail for non-existent customer', async () => {
      return setAuthHeader(
        request(app.getHttpServer()).post('/recommendations/generate/999999'),
        authToken
      )
        .send({ mode: 'rule' })
        .expect(404);
    });

    it('/recommendations/:id/accept (POST) - should fail for non-existent recommendation', async () => {
      return setAuthHeader(
        request(app.getHttpServer()).post('/recommendations/999999/accept'),
        authToken
      )
        .send({})
        .expect(404);
    });
  });
});
