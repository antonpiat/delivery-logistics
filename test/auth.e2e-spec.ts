import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '@/database/prisma.service';
import { createE2eApp } from './helpers/create-e2e-app';
import { authHeader, loginAs } from './helpers/auth';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `e2e-auth-${Date.now()}@leo.com`;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('logs in seeded admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leo.com', password: 'password123' })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.email).toBe('admin@leo.com');
    expect(response.body.user.role).toBe('ADMIN');
  });

  it('rejects invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leo.com', password: 'wrong-password' })
      .expect(401);
  });

  it('registers a new user and blocks login until verified', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'password123',
        role: 'CUSTOMER',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'password123' })
      .expect(401);

    expect(loginResponse.body.emailVerificationRequired).toBe(true);
  });

  it('verifies email and returns a JWT', async () => {
    const rawToken = randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { email: testEmail },
      data: {
        emailVerificationToken: createHash('sha256')
          .update(rawToken)
          .digest('hex'),
        emailVerificationExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/auth/verify-email?token=${rawToken}`)
      .expect(200);

    expect(response.body.message).toContain('verified');
    expect(response.body.accessToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'password123' })
      .expect(201);
  });

  it('rejects protected routes without a token', () => {
    return request(app.getHttpServer()).get('/api/v1/shipments').expect(401);
  });

  it('allows protected routes with a valid token', async () => {
    const token = await loginAs(app, 'admin@leo.com');

    return request(app.getHttpServer())
      .get('/api/v1/shipments')
      .set(authHeader(token))
      .expect(200);
  });
});
