import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '@/database/prisma.service';
import { createE2eApp } from './helpers/create-e2e-app';
import { authHeader, loginAs } from './helpers/auth';

describe('Pagination (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let customerId: string;
  const shipmentIds: string[] = [];

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);

    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: 'customer@leo.com' },
    });
    customerId = customer.id;
    adminToken = await loginAs(app, 'admin@leo.com');

    for (let index = 0; index < 3; index += 1) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/shipments')
        .set(authHeader(adminToken))
        .send({
          customerId,
          pickupAddress: `${index} Pickup St`,
          deliveryAddress: `${index} Delivery Ave`,
        })
        .expect(201);

      shipmentIds.push(response.body.id);
    }
  });

  afterAll(async () => {
    if (shipmentIds.length > 0) {
      await prisma.shipment.deleteMany({ where: { id: { in: shipmentIds } } });
    }
    await app.close();
  });

  it('returns the first page of shipments', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/shipments?limit=2')
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.hasMore).toBe(true);
    expect(response.body.meta.nextCursor).toEqual(expect.any(String));
  });

  it('returns the next page using cursor for infinite scroll', async () => {
    const firstPage = await request(app.getHttpServer())
      .get('/api/v1/shipments?limit=2')
      .set(authHeader(adminToken))
      .expect(200);

    const secondPage = await request(app.getHttpServer())
      .get(
        `/api/v1/shipments?limit=2&cursor=${encodeURIComponent(firstPage.body.meta.nextCursor)}`,
      )
      .set(authHeader(adminToken))
      .expect(200);

    expect(secondPage.body.data.length).toBeGreaterThan(0);
    expect(secondPage.body.data[0].id).not.toBe(firstPage.body.data[0].id);
  });

  it('returns paginated notifications shape', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/notifications?limit=1')
      .set(authHeader(adminToken))
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        limit: expect.any(Number),
        hasMore: expect.any(Boolean),
        nextCursor: null,
      }),
    );
  });
});
