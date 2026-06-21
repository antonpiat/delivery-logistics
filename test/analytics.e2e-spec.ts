import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/create-e2e-app';
import { authHeader, loginAs } from './helpers/auth';

describe('Analytics (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  beforeAll(async () => {
    const setup = await createE2eApp();
    app = setup.app;
    adminToken = await loginAs(app, 'admin@leo.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns overview metrics for admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/overview')
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body.summary).toEqual(
      expect.objectContaining({
        totalShipments: expect.any(Number),
        activeShipments: expect.any(Number),
        deliveryRate: expect.any(Number),
      }),
    );
    expect(response.body.shipmentsByStatus).toHaveProperty('PENDING');
    expect(response.body.drivers.total).toEqual(expect.any(Number));
  });

  it('returns shipment trend points', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/shipments/trend?days=7')
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body.days).toBe(7);
    expect(Array.isArray(response.body.points)).toBe(true);
    expect(response.body.points.length).toBeGreaterThan(0);
  });

  it('returns driver performance', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/drivers/performance')
      .set(authHeader(adminToken))
      .expect(200);

    expect(Array.isArray(response.body.drivers)).toBe(true);
  });

  it('forbids analytics for non-admin roles', async () => {
    const customerToken = await loginAs(app, 'customer@leo.com');

    await request(app.getHttpServer())
      .get('/api/v1/analytics/overview')
      .set(authHeader(customerToken))
      .expect(403);
  });
});
