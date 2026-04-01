import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('App E2E Quick Test (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/health (GET) - should return OK', async () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
        });
    });

    it('/version (GET) - should return version info', async () => {
      return request(app.getHttpServer())
        .get('/version')
        .expect(200)
        .expect((res) => {
          expect(res.body.version).toBeDefined();
          expect(res.body.buildDate).toBeDefined();
        });
    });
  });

  describe('API Documentation', () => {
    it('/api-json (GET) - should return OpenAPI spec', async () => {
      return request(app.getHttpServer())
        .get('/api-json')
        .expect(200)
        .expect((res) => {
          expect(res.body.openapi).toBeDefined();
          expect(res.body.info).toBeDefined();
        });
    });
  });
});
