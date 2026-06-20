import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '@/database/prisma.service';
import { ShipmentStatus } from '@/common/enums/shipment-status.enum';
import { createE2eApp } from './helpers/create-e2e-app';
import { authHeader, loginAs } from './helpers/auth';

describe('Shipments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let driverToken: string;
  let customerId: string;
  let driverId: string;
  let shipmentId: string;

  beforeAll(async () => {
    const setup = await createE2eApp();
    app = setup.app;
    prisma = app.get(PrismaService);

    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: 'customer@leo.com' },
    });
    const driver = await prisma.driver.findFirstOrThrow({
      where: { user: { email: 'driver@leo.com' } },
    });

    customerId = customer.id;
    driverId = driver.id;
    adminToken = await loginAs(app, 'admin@leo.com');
    driverToken = await loginAs(app, 'driver@leo.com');
  });

  afterAll(async () => {
    if (shipmentId) {
      await prisma.shipment.delete({ where: { id: shipmentId } }).catch(() => undefined);
    }
    await app.close();
  });

  it('creates a shipment as admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/shipments')
      .set(authHeader(adminToken))
      .send({
        customerId,
        pickupAddress: '100 Test Pickup St',
        deliveryAddress: '200 Test Delivery Ave',
        notes: 'E2E shipment',
      })
      .expect(201);

    expect(response.body.trackingCode).toEqual(expect.any(String));
    expect(response.body.status).toBe(ShipmentStatus.PENDING);

    shipmentId = response.body.id;
  });

  it('rejects invalid status transitions', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/shipments/${shipmentId}/status`)
      .set(authHeader(adminToken))
      .send({ status: ShipmentStatus.DELIVERED })
      .expect(400);
  });

  it('assigns a driver as admin', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/shipments/${shipmentId}/status`)
      .set(authHeader(adminToken))
      .send({ status: ShipmentStatus.ASSIGNED, driverId })
      .expect(200);

    expect(response.body.status).toBe(ShipmentStatus.ASSIGNED);
    expect(response.body.driverId).toBe(driverId);
  });

  it('allows the assigned driver to mark in transit', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/shipments/${shipmentId}/status`)
      .set(authHeader(driverToken))
      .send({ status: ShipmentStatus.IN_TRANSIT })
      .expect(200);

    expect(response.body.status).toBe(ShipmentStatus.IN_TRANSIT);
  });

  it('blocks drivers from admin-only transitions', async () => {
    const pendingShipment = await request(app.getHttpServer())
      .post('/api/v1/shipments')
      .set(authHeader(adminToken))
      .send({
        customerId,
        pickupAddress: '300 Block Pickup St',
        deliveryAddress: '400 Block Delivery Ave',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/shipments/${pendingShipment.body.id}/status`)
      .set(authHeader(driverToken))
      .send({ status: ShipmentStatus.ASSIGNED, driverId })
      .expect(403);

    await prisma.shipment.delete({ where: { id: pendingShipment.body.id } });
  });

  it('completes the delivery flow', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/shipments/${shipmentId}/status`)
      .set(authHeader(driverToken))
      .send({ status: ShipmentStatus.DELIVERED })
      .expect(200);

    expect(response.body.status).toBe(ShipmentStatus.DELIVERED);
    expect(response.body.deliveredAt).toEqual(expect.any(String));
  });

  it('tracks shipment by code', async () => {
    const shipment = await prisma.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
    });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/shipments/track/${shipment.trackingCode}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(response.body.id).toBe(shipmentId);
    expect(response.body.status).toBe(ShipmentStatus.DELIVERED);
  });
});
