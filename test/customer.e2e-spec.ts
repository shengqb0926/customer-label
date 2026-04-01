import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getTestConfig, createTestTypeOrmConfig, sleep } from './test-utils';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { loginAndGetToken, setAuthHeader } from '../test-helpers';

describe('Customer API E2E (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let createdCustomerId: number;
  let testIdentifier: string;

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
    await app.close();
  });

  describe('Customer CRUD Operations', () => {
    it('/customers (POST) - should create a new customer', async () => {
      testIdentifier = `test_customer_${Date.now()}`;
      
      const createCustomerDto = {
        name: testIdentifier,
        email: `${testIdentifier}@example.com`,
        phone: '13800138000',
        level: 'BRONZE',
        riskLevel: 'LOW',
        gender: 'M',
        age: 30,
        city: '北京',
        orderCount: 5,
        totalAssets: 5000,
        lastOrderDate: new Date().toISOString(),
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/customers'),
        authToken
      )
        .send(createCustomerDto)
        .expect(201);

      expect(response.body.name).toBe(createCustomerDto.name);
      expect(response.body.email).toBe(createCustomerDto.email);
      expect(response.body.id).toBeDefined();
      
      createdCustomerId = parseInt(response.body.id);
    });

    it('/customers/:id (GET) - should get customer by id', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get(`/customers/${createdCustomerId}`),
        authToken
      )
        .expect(200);

      expect(response.body.id).toBe(createdCustomerId);
      expect(response.body.name).toContain('test_customer_');
    });

    it('/customers (GET) - should get customers list with pagination', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/customers?page=1&limit=10'),
        authToken
      )
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('/customers/:id (PUT) - should update customer', async () => {
      const updateDto = {
        name: `${testIdentifier}_updated`,
        orderCount: 10,
        totalAssets: 10000,
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).put(`/customers/${createdCustomerId}`),
        authToken
      )
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
      expect(response.body.orderCount).toBe(updateDto.orderCount);
    });

    it('/customers/statistics (GET) - should get customer statistics', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/customers/statistics'),
        authToken
      )
        .expect(200);

      expect(response.body.total).toBeDefined();
      expect(response.body.byLevel).toBeDefined();
      expect(response.body.byRiskLevel).toBeDefined();
    });

    it('/customers/:id (DELETE) - should delete customer', async () => {
      await setAuthHeader(
        request(app.getHttpServer()).delete(`/customers/${createdCustomerId}`),
        authToken
      )
        .expect(200);

      // Verify deletion
      await setAuthHeader(
        request(app.getHttpServer()).get(`/customers/${createdCustomerId}`),
        authToken
      )
        .expect(404);
    });
  });

  describe('Customer RFM Analysis', () => {
    let rfmCustomerId: number;

    beforeAll(async () => {
      // Create a customer for RFM testing
      const createDto = {
        name: `RFM_Test_${Date.now()}`,
        email: `rfm_${Date.now()}@example.com`,
        orderCount: 15,
        totalAssets: 50000,
      };

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/customers'),
        authToken
      )
        .send(createDto)
        .expect(201);

      rfmCustomerId = parseInt(response.body.id);
    });

    afterAll(async () => {
      if (rfmCustomerId) {
        await setAuthHeader(
          request(app.getHttpServer()).delete(`/customers/${rfmCustomerId}`),
          authToken
        )
          .expect(200);
      }
    });

    it('/customers/rfm/analyze/:id (GET) - should analyze customer RFM', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get(`/customers/rfm/analyze/${rfmCustomerId}`),
        authToken
      )
        .expect(200);

      expect(response.body.customerId).toBe(rfmCustomerId);
      expect(response.body.rScore).toBeDefined();
      expect(response.body.fScore).toBeDefined();
      expect(response.body.mScore).toBeDefined();
      expect(response.body.segment).toBeDefined();
    });

    it('/customers/rfm/summary (GET) - should get RFM summary', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/customers/rfm/summary'),
        authToken
      )
        .expect(200);

      expect(response.body.segments).toBeDefined();
      expect(Array.isArray(response.body.segments)).toBe(true);
    });

    it('/customers/rfm/high-value (GET) - should get high value customers', async () => {
      const response = await setAuthHeader(
        request(app.getHttpServer()).get('/customers/rfm/high-value?limit=10'),
        authToken
      )
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0].id).toBeDefined();
        expect(response.body[0].name).toBeDefined();
      }
    });
  });

  describe('Customer Batch Operations', () => {
    it('/customers/batch (POST) - should batch create customers', async () => {
      const customers = [
        {
          name: `Batch_Customer_1_${Date.now()}`,
          email: `batch1_${Date.now()}@example.com`,
          level: 'SILVER',
        },
        {
          name: `Batch_Customer_2_${Date.now()}`,
          email: `batch2_${Date.now()}@example.com`,
          level: 'GOLD',
        },
      ];

      const response = await setAuthHeader(
        request(app.getHttpServer()).post('/customers/batch'),
        authToken
      )
        .send(customers)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].name).toContain('Batch_Customer_1_');
      expect(response.body[1].name).toContain('Batch_Customer_2_');
    });

    it('/customers/batch (DELETE) - should batch delete customers', async () => {
      // First create some customers
      const createResponse = await setAuthHeader(
        request(app.getHttpServer()).post('/customers/batch'),
        authToken
      )
        .send([
          { name: `ToDelete_1_${Date.now()}`, email: `del1_${Date.now()}@test.com` },
          { name: `ToDelete_2_${Date.now()}`, email: `del2_${Date.now()}@test.com` },
        ])
        .expect(201);

      const idsToDelete = createResponse.body.map((c: any) => c.id);

      // Then delete them
      const deleteResponse = await setAuthHeader(
        request(app.getHttpServer()).delete('/customers/batch'),
        authToken
      )
        .send({ ids: idsToDelete })
        .expect(200);

      expect(deleteResponse.body.deleted).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('/customers/:id (GET) - should return 404 for non-existent customer', async () => {
      return setAuthHeader(
        request(app.getHttpServer()).get('/customers/999999'),
        authToken
      )
        .expect(404);
    });

    it('/customers (POST) - should fail with invalid email', async () => {
      return setAuthHeader(
        request(app.getHttpServer()).post('/customers'),
        authToken
      )
        .send({
          name: 'Test Customer',
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('/customers (POST) - should fail with duplicate email', async () => {
      const uniqueEmail = `dup_${Date.now()}@test.com`;
      
      // Create first customer
      await setAuthHeader(
        request(app.getHttpServer()).post('/customers'),
        authToken
      )
        .send({
          name: 'First Customer',
          email: uniqueEmail,
        })
        .expect(201);

      // Try to create with same email
      return setAuthHeader(
        request(app.getHttpServer()).post('/customers'),
        authToken
      )
        .send({
          name: 'Second Customer',
          email: uniqueEmail,
        })
        .expect(400);
    });
  });
});
