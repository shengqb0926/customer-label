import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';

describe('Authentication & Authorization E2E (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testUserId: number;

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
  });

  afterAll(async () => {
    if (testUserId) {
      try {
        // Cleanup test user if needed
      } catch (e) {}
    }
    await app.close();
  });

  describe('User Registration', () => {
    const uniqueUsername = `testuser_${Date.now()}`;
    const uniqueEmail = `testuser_${Date.now()}@example.com`;

    it('/auth/register (POST) - should register a new user', async () => {
      const registerDto = {
        username: uniqueUsername,
        email: uniqueEmail,
        password: 'TestPassword123!',
        fullName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.username).toBe(uniqueUsername);
      expect(response.body.email).toBe(uniqueEmail);
      expect(response.body.password).toBeUndefined(); // Password should not be returned

      testUserId = response.body.id;
    });

    it('/auth/register (POST) - should fail with duplicate username', async () => {
      const duplicateUser = {
        username: uniqueUsername,
        email: `another_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(duplicateUser)
        .expect(400);
    });

    it('/auth/register (POST) - should fail with invalid email', async () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `invalid_${Date.now()}`,
          email: 'not-an-email',
          password: 'TestPassword123!',
        })
        .expect(400);
    });

    it('/auth/register (POST) - should fail with weak password', async () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `weak_${Date.now()}`,
          email: `weak_${Date.now()}@example.com`,
          password: '123', // Too short
        })
        .expect(400);
    });
  });

  describe('User Login', () => {
    const loginCredentials = {
      username: `testuser_${Date.now() - 1000}`, // Use recent username
      password: 'TestPassword123!',
    };

    it('/auth/login (POST) - should login successfully and return JWT token', async () => {
      // First register a user
      const uniqueUsername = `logintest_${Date.now()}`;
      const uniqueEmail = `logintest_${Date.now()}@example.com`;
      
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: uniqueUsername,
          email: uniqueEmail,
          password: loginCredentials.password,
        })
        .expect(201);

      // Then login
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: uniqueUsername,
          password: loginCredentials.password,
        })
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(typeof response.body.access_token).toBe('string');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(uniqueUsername);

      authToken = response.body.access_token;
    });

    it('/auth/login (POST) - should fail with wrong password', async () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: `testuser_${Date.now() - 2000}`,
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('/auth/login (POST) - should fail with non-existent user', async () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'nonexistent_user',
          password: 'SomePassword',
        })
        .expect(401);
    });
  });

  describe('Protected Routes with JWT', () => {
    let localAuthToken: string;

    beforeAll(async () => {
      // Create a user and get token for protected route tests
      const uniqueUsername = `protected_${Date.now()}`;
      const uniqueEmail = `protected_${Date.now()}@example.com`;
      
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: uniqueUsername,
          email: uniqueEmail,
          password: 'TestPassword123!',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: uniqueUsername,
          password: 'TestPassword123!',
        })
        .expect(200);

      localAuthToken = loginResponse.body.access_token;
    });

    it('/customers (GET) - should access protected route with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers?page=1&limit=10')
        .set('Authorization', `Bearer ${localAuthToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('/customers (POST) - should create resource with valid token', async () => {
      const customerData = {
        name: `Auth Test Customer_${Date.now()}`,
        email: `auth_customer_${Date.now()}@example.com`,
      };

      const response = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${localAuthToken}`)
        .send(customerData)
        .expect(201);

      expect(response.body.name).toBe(customerData.name);
    });

    it('/customers (GET) - should reject request without token', async () => {
      return request(app.getHttpServer())
        .get('/customers')
        .expect(401);
    });

    it('/customers (GET) - should reject request with invalid token', async () => {
      return request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Health Check Endpoints', () => {
    it('/health (GET) - should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBeDefined();
    });

    it('/version (GET) - should return version info', async () => {
      const response = await request(app.getHttpServer())
        .get('/version')
        .expect(200);

      expect(response.body.version).toBeDefined();
      expect(response.body.buildDate).toBeDefined();
    });
  });

  describe('API Documentation', () => {
    it('/api-docs (GET) - should return Swagger documentation', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-docs/')
        .expect(200);

      expect(response.text).toContain('swagger');
    });

    it('/api-json (GET) - should return OpenAPI JSON', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      expect(response.body.openapi).toBeDefined();
      expect(response.body.info).toBeDefined();
      expect(response.body.paths).toBeDefined();
    });
  });
});
