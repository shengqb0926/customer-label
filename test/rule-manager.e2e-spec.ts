import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { loginAndGetToken, setAuthHeader } from '../test-helpers';

describe('Rule Manager E2E', () => {
  let app: INestApplication;
  let authToken: string;
  let createdRuleId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // 获取认证 token
    const tokens = await loginAndGetToken(app);
    authToken = tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/rules (POST)', () => {
    it('should create a new rule', async () => {
      const createRuleDto = {
        ruleName: '高价值客户规则',
        ruleExpression: 'orderCount >= 10 && totalAmount >= 10000',
        priority: 80,
        tagTemplate: {
          name: '高价值客户',
          category: '客户价值',
          baseConfidence: 0.85,
        },
        isActive: true,
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/rules'),
        authToken
      )
        .send(createRuleDto)
        .expect(201);

      expect(response.body.ruleName).toBe(createRuleDto.ruleName);
      expect(response.body.priority).toBe(createRuleDto.priority);
      expect(response.body.isActive).toBe(true);
      expect(response.body.id).toBeDefined();

      createdRuleId = parseInt(response.body.id);
    });

    it('should fail to create rule with duplicate name', async () => {
      const createRuleDto = {
        ruleName: '高价值客户规则',
        ruleExpression: 'orderCount >= 5',
        priority: 70,
        tagTemplate: {
          name: '测试标签',
          category: '测试',
          baseConfidence: 0.7,
        },
      };

      return setAuthHeader(
        request(app.getHttpServer()).post('/rules'),
        authToken
      )
        .send(createRuleDto)
        .expect(400);
    });

    it('should fail to create rule with invalid expression', async () => {
      const createRuleDto = {
        ruleName: '无效规则',
        ruleExpression: 'eval("malicious code")',
        priority: 50,
        tagTemplate: {
          name: '测试',
          category: '测试',
          baseConfidence: 0.5,
        },
      };

      return setAuthHeader(
        request(app.getHttpServer()).post('/rules'),
        authToken
      )
        .send(createRuleDto)
        .expect(400);
    });
  });

  describe('/rules (GET)', () => {
    it('should get rules list', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/rules'),
        authToken
      )
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(response.body.page).toBeDefined();
      expect(response.body.limit).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/rules?page=1&limit=5'),
        authToken
      )
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
    });

    it('should filter by isActive status', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/rules?isActive=true'),
        authToken
      )
        .expect(200);

      response.body.data.forEach((rule: any) => {
        expect(rule.isActive).toBe(true);
      });
    });
  });

  describe('/rules/:id (GET)', () => {
    it('should get rule by id', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get(`/rules/${createdRuleId}`),
        authToken
      )
        .expect(200);

      expect(response.body.id).toBe(createdRuleId);
      expect(response.body.ruleName).toBe('高价值客户规则');
    });

    it('should return 404 for non-existent rule', async () => {
      return setAuthHeader(
        request(app.getHttpServer()).get('/rules/999999'),
        authToken
      )
        .expect(404);
    });
  });

  describe('/rules/:id (PUT)', () => {
    it('should update rule', async () => {
      const updateDto = {
        priority: 90,
        isActive: false,
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).put(`/rules/${createdRuleId}`),
        authToken
      )
        .send(updateDto)
        .expect(200);

      expect(response.body.priority).toBe(90);
      expect(response.body.isActive).toBe(false);
    });

    it('should fail to update with duplicate name', async () => {
      // First create another rule
      const createRuleDto = {
        ruleName: '另一个规则',
        ruleExpression: 'orderCount >= 3',
        priority: 60,
        tagTemplate: {
          name: '测试',
          category: '测试',
          baseConfidence: 0.6,
        },
      };

      const createResponse = await setAuthHeader(
        request(app.getHttpServer()).post('/rules'),
        authToken
      )
        .send(createRuleDto)
        .expect(201);

      const otherRuleId = parseInt(createResponse.body.id);

      // Try to update name to match existing rule
      return setAuthHeader(
        request(app.getHttpServer()).put(`/rules/${otherRuleId}`),
        authToken
      )
        .send({ ruleName: '高价值客户规则' })
        .expect(400);
    });
  });

  describe('/rules/:id/activate (POST)', () => {
    it('should activate rule', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).post(`/rules/${createdRuleId}/activate`),
        authToken
      )
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });

  describe('/rules/:id/deactivate (POST)', () => {
    it('should deactivate rule', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).post(`/rules/${createdRuleId}/deactivate`),
        authToken
      )
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });
  });

  describe('/rules/test (POST)', () => {
    it('should test valid rule expression', async () => {
      const testData = {
        expression: 'orderCount >= 10 && totalAmount >= 10000',
        testData: {
          orderCount: 15,
          totalAmount: 15000,
        },
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/rules/test'),
        authToken
      )
        .send(testData)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.result).toBe(true);
    });

    it('should return false for expression that evaluates to false', async () => {
      const testData = {
        expression: 'orderCount >= 10 && totalAmount >= 10000',
        testData: {
          orderCount: 5,
          totalAmount: 5000,
        },
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/rules/test'),
        authToken
      )
        .send(testData)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.result).toBe(false);
    });

    it('should detect invalid expression', async () => {
      const testData = {
        expression: 'invalid syntax (((',
        testData: { orderCount: 10 },
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/rules/test'),
        authToken
      )
        .send(testData)
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('/rules/batch/export (GET)', () => {
    it('should export all rules', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/rules/batch/export'),
        authToken
      )
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const exportedRule = response.body.find(
        (rule: any) => rule.ruleName === '高价值客户规则',
      );
      expect(exportedRule).toBeDefined();
      expect(exportedRule.priority).toBeDefined();
    });
  });

  describe('/rules/batch/import (POST)', () => {
    it('should batch import rules', async () => {
      const rulesToImport = [
        {
          ruleName: '批量导入规则 1',
          ruleExpression: 'orderCount >= 2',
          priority: 40,
          tagTemplate: {
            name: '导入测试 1',
            category: '测试',
            baseConfidence: 0.5,
          },
        },
        {
          ruleName: '批量导入规则 2',
          ruleExpression: 'totalAmount >= 5000',
          priority: 50,
          tagTemplate: {
            name: '导入测试 2',
            category: '测试',
            baseConfidence: 0.6,
          },
        },
      ];

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/rules/batch/import'),
        authToken
      )
        .send(rulesToImport)
        .expect(201);

      expect(response.body.total).toBe(2);
      expect(response.body.success).toBe(2);
      expect(response.body.failed).toBe(0);
    });

    it('should handle partial failures in batch import', async () => {
      const rulesToImport = [
        {
          ruleName: '高价值客户规则', // Duplicate name
          ruleExpression: 'orderCount >= 1',
          priority: 30,
          tagTemplate: {
            name: '重复测试',
            category: '测试',
            baseConfidence: 0.4,
          },
        },
        {
          ruleName: '唯一规则',
          ruleExpression: 'orderCount >= 1',
          priority: 30,
          tagTemplate: {
            name: '唯一测试',
            category: '测试',
            baseConfidence: 0.4,
          },
        },
      ];

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/rules/batch/import'),
        authToken
      )
        .send(rulesToImport)
        .expect(201);

      expect(response.body.total).toBe(2);
      expect(response.body.success).toBe(1);
      expect(response.body.failed).toBe(1);
      expect(response.body.errors.length).toBe(1);
    });
  });

  describe('/rules/:id (DELETE)', () => {
    it('should delete rule', async () => {
      // First create a rule to delete
      const createResponse = await setAuthHeader(
        request(app.getHttpServer()).post('/rules'),
        authToken
      )
        .send({
          ruleName: '待删除规则',
          ruleExpression: 'orderCount >= 1',
          priority: 10,
          tagTemplate: {
            name: '删除测试',
            category: '测试',
            baseConfidence: 0.3,
          },
        })
        .expect(201);

      const ruleIdToDelete = parseInt(createResponse.body.id);

      // Delete the rule
      await setAuthHeader(
        request(app.getHttpServer()).delete(`/rules/${ruleIdToDelete}`),
        authToken
      )
        .expect(200);

      // Verify deletion
      return setAuthHeader(
        request(app.getHttpServer()).get(`/rules/${ruleIdToDelete}`),
        authToken
      )
        .expect(404);
    });
  });
});
