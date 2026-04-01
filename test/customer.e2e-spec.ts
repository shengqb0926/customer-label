import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getTestConfig, createTestTypeOrmConfig, sleep } from './test-utils';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('Customer API E2E (e2e)', () => {
  let app: INestApplication;
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
        totalOrders: 5,
        totalAmount: 5000,
        lastOrderDate: new Date().toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/customers')
        .send(createCustomerDto)
        .expect(201);

      expect(response.body.name).toBe(createCustomerDto.name);
      expect(response.body.email).toBe(createCustomerDto.email);
      expect(response.body.id).toBeDefined();
      
      createdCustomerId = parseInt(response.body.id);
    });

    it('/customers/:id (GET) - should get customer by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/${createdCustomerId}`)
        .expect(200);

      expect(response.body.id).toBe(createdCustomerId);
      expect(response.body.name).toContain('test_customer_');
    });

    it('/customers (GET) - should get customers list with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers?page=1&limit=10')
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
        totalOrders: 10,
        totalAmount: 10000,
      };

      const response = await request(app.getHttpServer())
        .put(`/customers/${createdCustomerId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
      expect(response.body.totalOrders).toBe(updateDto.totalOrders);
    });

    it('/customers/statistics (GET) - should get customer statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/statistics')
        .expect(200);

      expect(response.body.total).toBeDefined();
      expect(response.body.byLevel).toBeDefined();
      expect(response.body.byRiskLevel).toBeDefined();
    });

    it('/customers/:id (DELETE) - should delete customer', async () => {
      await request(app.getHttpServer())
        .delete(`/customers/${createdCustomerId}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/customers/${createdCustomerId}`)
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
        totalOrders: 15,
        totalAmount: 50000,
        lastOrderDate: new Date().toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/customers')
        .send(createDto)
        .expect(201);

      rfmCustomerId = parseInt(response.body.id);
    });

    afterAll(async () => {
      if (rfmCustomerId) {
        await request(app.getHttpServer())
          .delete(`/customers/${rfmCustomerId}`)
          .expect(200);
      }
    });

    it('/customers/rfm/analyze/:id (GET) - should analyze customer RFM', async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/rfm/analyze/${rfmCustomerId}`)
        .expect(200);

      expect(response.body.customerId).toBe(rfmCustomerId);
      expect(response.body.rScore).toBeDefined();
      expect(response.body.fScore).toBeDefined();
      expect(response.body.mScore).toBeDefined();
      expect(response.body.segment).toBeDefined();
    });

    it('/customers/rfm/summary (GET) - should get RFM summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/rfm/summary')
        .expect(200);

      expect(response.body.segments).toBeDefined();
      expect(Array.isArray(response.body.segments)).toBe(true);
    });

    it('/customers/rfm/high-value (GET) - should get high value customers', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers/rfm/high-value?limit=10')
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

      const response = await request(app.getHttpServer())
        .post('/customers/batch')
        .send(customers)
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].name).toContain('Batch_Customer_1_');
      expect(response.body[1].name).toContain('Batch_Customer_2_');
    });

    it('/customers/batch (DELETE) - should batch delete customers', async () => {
      // First create some customers
      const createResponse = await request(app.getHttpServer())
        .post('/customers/batch')
        .send([
          { name: `ToDelete_1_${Date.now()}`, email: `del1_${Date.now()}@test.com` },
          { name: `ToDelete_2_${Date.now()}`, email: `del2_${Date.now()}@test.com` },
        ])
        .expect(201);

      const idsToDelete = createResponse.body.map((c: any) => c.id);

      // Then delete them
      const deleteResponse = await request(app.getHttpServer())
        .delete('/customers/batch')
        .send({ ids: idsToDelete })
        .expect(200);

      expect(deleteResponse.body.deleted).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('/customers/:id (GET) - should return 404 for non-existent customer', async () => {
      return request(app.getHttpServer())
        .get('/customers/999999')
        .expect(404);
    });

    it('/customers (POST) - should fail with invalid email', async () => {
      return request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'Test Customer',
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('/customers (POST) - should fail with duplicate email', async () => {
      const uniqueEmail = `dup_${Date.now()}@test.com`;
      
      // Create first customer
      await request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'First Customer',
          email: uniqueEmail,
        })
        .expect(201);

      // Try to create with same email
      return request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'Second Customer',
          email: uniqueEmail,
        })
        .expect(400);
    });
  });
});
