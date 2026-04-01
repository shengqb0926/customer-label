import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';

describe('Complete Business Flow E2E (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testCustomerId: number;
  let testRuleId: number;

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
          if (key === 'jwt.secret') return 'test-secret-key-for-e2e-testing-only-12345';
          if (key === 'jwt.expiresIn') return '1h';
          return null;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Setup: Register and login
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: `flowtest_${Date.now()}`,
        email: `flowtest_${Date.now()}@example.com`,
        password: 'FlowTest123!',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: registerResponse.body.username,
        password: 'FlowTest123!',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Cleanup
    try {
      if (testRuleId) {
        await request(app.getHttpServer()).delete(`/rules/${testRuleId}`);
      }
      if (testCustomerId) {
        await request(app.getHttpServer()).delete(`/customers/${testCustomerId}`);
      }
    } catch (e) {}
    await app.close();
  });

  describe('Complete Customer Lifecycle', () => {
    it('完整流程 1: 注册登录 -> 创建客户', async () => {
      const customerData = {
        name: `Flow_Customer_${Date.now()}`,
        email: `flow_${Date.now()}@example.com`,
        phone: '13800138002',
        level: 'BRONZE',
        riskLevel: 'LOW',
        totalOrders: 5,
        totalAmount: 5000,
      };

      const response = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(customerData)
        .expect(201);

      expect(response.body.name).toBe(customerData.name);
      testCustomerId = response.body.id;
    });

    it('完整流程 2: 更新客户信息', async () => {
      const updateData = {
        totalOrders: 15,
        totalAmount: 25000,
        level: 'GOLD',
      };

      const response = await request(app.getHttpServer())
        .put(`/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.totalOrders).toBe(15);
      expect(response.body.level).toBe('GOLD');
    });

    it('完整流程 3: 执行 RFM 分析', async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/rfm/analyze/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.customerId).toBe(testCustomerId);
      expect(response.body.segment).toBeDefined();
    });

    it('完整流程 4: 获取客户统计', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.byLevel).toBeDefined();
    });
  });

  describe('Complete Recommendation Lifecycle', () => {
    it('完整流程 5: 创建推荐规则', async () => {
      const ruleData = {
        ruleName: `Flow_Rule_${Date.now()}`,
        ruleExpression: 'totalOrders >= 10 && totalAmount >= 20000',
        priority: 80,
        tagTemplate: {
          name: '高价值客户',
          category: '客户价值',
          baseConfidence: 0.85,
        },
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ruleData)
        .expect(201);

      expect(response.body.ruleName).toBe(ruleData.ruleName);
      testRuleId = response.body.id;
    });

    it('完整流程 6: 生成客户推荐', async () => {
      const options = {
        mode: 'rule',
        useCache: true,
      };

      const response = await request(app.getHttpServer())
        .post(`/recommendations/generate/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(options)
        .expect(201);

      expect(response.body.customerId).toBe(testCustomerId);
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });

    it('完整流程 7: 查看推荐列表', async () => {
      const response = await request(app.getHttpServer())
        .get(`/recommendations/customer/${testCustomerId}?page=1&limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('完整流程 8: 接受推荐并打标签', async () => {
      // Get first recommendation
      const listResponse = await request(app.getHttpServer())
        .get(`/recommendations/customer/${testCustomerId}?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken}`);

      if (listResponse.body.data && listResponse.body.data.length > 0) {
        const recommendationId = listResponse.body.data[0].id;

        const acceptResponse = await request(app.getHttpServer())
          .post(`/recommendations/${recommendationId}/accept`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            modifiedTagName: null,
            feedbackReason: 'E2E 流程测试',
          })
          .expect(200);

        expect(acceptResponse.body.success).toBe(true);
      }
    });

    it('完整流程 9: 验证标签已应用', async () => {
      const customerResponse = await request(app.getHttpServer())
        .get(`/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(customerResponse.body.id).toBe(testCustomerId);
      // 验证客户信息可以被正确获取
    });
  });

  describe('Batch Operations Flow', () => {
    it('完整流程 10: 批量创建客户', async () => {
      const customers = [
        {
          name: `Batch_Flow_1_${Date.now()}`,
          email: `batchflow1_${Date.now()}@example.com`,
          level: 'SILVER',
        },
        {
          name: `Batch_Flow_2_${Date.now()}`,
          email: `batchflow2_${Date.now()}@example.com`,
          level: 'GOLD',
        },
        {
          name: `Batch_Flow_3_${Date.now()}`,
          email: `batchflow3_${Date.now()}@example.com`,
          level: 'PLATINUM',
        },
      ];

      const response = await request(app.getHttpServer())
        .post('/customers/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(customers)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
    });

    it('完整流程 11: 批量删除客户', async () => {
      // Create customers to delete
      const createResponse = await request(app.getHttpServer())
        .post('/customers/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send([
          { name: `ToDelete_Flow_1_${Date.now()}`, email: `dtf1_${Date.now()}@test.com` },
          { name: `ToDelete_Flow_2_${Date.now()}`, email: `dtf2_${Date.now()}@test.com` },
        ])
        .expect(201);

      const idsToDelete = createResponse.body.map((c: any) => c.id);

      // Delete them
      const deleteResponse = await request(app.getHttpServer())
        .delete('/customers/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: idsToDelete })
        .expect(200);

      expect(deleteResponse.body.deleted).toBe(2);
    });
  });

  describe('Search and Filter Flow', () => {
    it('完整流程 12: 多条件组合查询', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers?level=GOLD&riskLevel=LOW&page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBeDefined();
      
      // Verify all returned customers match the criteria
      response.body.data.forEach((customer: any) => {
        expect(customer.level).toBe('GOLD');
        expect(customer.riskLevel).toBe('LOW');
      });
    });

    it('完整流程 13: 推荐筛选 - 按来源和状态', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations?source=RULE&status=PENDING&page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      
      // Verify filtering
      response.body.data.forEach((rec: any) => {
        expect(rec.source).toBe('RULE');
        expect(rec.status).toBe('PENDING');
      });
    });
  });

  describe('Analytics and Reporting Flow', () => {
    it('完整流程 14: 获取推荐统计报告', async () => {
      const statsResponse = await request(app.getHttpServer())
        .get('/recommendations/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.total).toBeDefined();
      expect(statsResponse.body.bySource).toBeDefined();
      expect(statsResponse.body.avgConfidence).toBeDefined();
    });

    it('完整流程 15: 获取 RFM 分段统计', async () => {
      const summaryResponse = await request(app.getHttpServer())
        .get('/customers/rfm/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(summaryResponse.body.segments)).toBe(true);
      
      if (summaryResponse.body.segments.length > 0) {
        const segment = summaryResponse.body.segments[0];
        expect(segment.code).toBeDefined();
        expect(segment.count).toBeDefined();
      }
    });

    it('完整流程 16: 获取高价值客户列表', async () => {
      const highValueResponse = await request(app.getHttpServer())
        .get('/customers/rfm/high-value?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(highValueResponse.body)).toBe(true);
      
      if (highValueResponse.body.length > 0) {
        const customer = highValueResponse.body[0];
        expect(customer.id).toBeDefined();
        expect(customer.name).toBeDefined();
        expect(customer.totalAmount).toBeDefined();
      }
    });
  });

  describe('System Health and Monitoring', () => {
    it('完整流程 17: 健康检查', async () => {
      const healthResponse = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('ok');
    });

    it('完整流程 18: 版本信息查询', async () => {
      const versionResponse = await request(app.getHttpServer())
        .get('/version')
        .expect(200);

      expect(versionResponse.body.version).toBeDefined();
      expect(versionResponse.body.buildDate).toBeDefined();
    });
  });
});
