import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export interface TestAuthTokens {
  accessToken: string;
  userId: number;
  username: string;
}

/**
 * 在测试应用中注册并登录用户，获取认证 token
 * @param app - NestJS 测试应用实例
 * @returns 包含 access_token 和用户信息的对象
 */
export async function loginAndGetToken(app: INestApplication): Promise<TestAuthTokens> {
  const timestamp = Date.now();
  const testUsername = `testuser_${timestamp}`;
  const testEmail = `testuser_${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';

  // 1. 注册用户
  const registerResponse = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      username: testUsername,
      email: testEmail,
      password: testPassword,
      fullName: 'Test User',
    });

  if (registerResponse.status !== 201) {
    throw new Error(`Failed to register test user: ${registerResponse.status}`);
  }

  const userId = registerResponse.body.id;

  // 2. 登录获取 token
  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      username: testUsername,
      password: testPassword,
    });

  if (loginResponse.status !== 200 && loginResponse.status !== 201) {
    throw new Error(`Failed to login test user: ${loginResponse.status}`);
  }

  return {
    accessToken: loginResponse.body.access_token,
    userId,
    username: testUsername,
  };
}

/**
 * 为请求设置认证头
 * @param req - Supertest 请求对象
 * @param token - JWT access token
 * @returns 设置了认证头的请求对象
 */
export function setAuthHeader<T>(req: T, token: string): T {
  // Type assertion to handle supertest's type chaining
  return (req as any).set('Authorization', `Bearer ${token}`);
}
