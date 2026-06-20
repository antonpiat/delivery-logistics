import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';

export async function loginAs(
  app: INestApplication<App>,
  email: string,
  password = 'password123',
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(201);

  return response.body.accessToken as string;
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
