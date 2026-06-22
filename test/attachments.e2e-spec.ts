import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '@/database/prisma.service';
import { ShipmentStatus } from '@/common/enums/shipment-status.enum';
import { AttachmentType } from '@/common/enums/attachment-type.enum';
import { storageServiceMock } from './helpers/storage.mock';
import { createE2eApp } from './helpers/create-e2e-app';
import { authHeader, loginAs } from './helpers/auth';

describe('Shipment attachments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let driverToken: string;
  let customerToken: string;
  let customerId: string;
  let driverId: string;
  let shipmentId: string;
  let attachmentId: string;

  beforeAll(async () => {
    app = await createE2eApp();
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
    customerToken = await loginAs(app, 'customer@leo.com');

    const shipment = await request(app.getHttpServer())
      .post('/api/v1/shipments')
      .set(authHeader(adminToken))
      .send({
        customerId,
        pickupAddress: '500 Upload Pickup St',
        deliveryAddress: '600 Upload Delivery Ave',
      })
      .expect(201);

    shipmentId = shipment.body.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/shipments/${shipmentId}/status`)
      .set(authHeader(adminToken))
      .send({ status: ShipmentStatus.ASSIGNED, driverId })
      .expect(200);
  });

  afterAll(async () => {
    if (shipmentId) {
      await prisma.shipment
        .delete({ where: { id: shipmentId } })
        .catch(() => undefined);
    }
    await app.close();
  });

  it('uploads an attachment as the assigned driver', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/shipments/${shipmentId}/attachments`)
      .set(authHeader(driverToken))
      .field('type', AttachmentType.PROOF_OF_DELIVERY)
      .attach('file', Buffer.from('fake-image-content'), {
        filename: 'proof.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(storageServiceMock.upload).toHaveBeenCalled();
    expect(response.body.fileName).toBe('proof.jpg');
    expect(response.body.url).toContain('https://');

    attachmentId = response.body.id;
  });

  it('lists attachments for the shipment customer', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/shipments/${shipmentId}/attachments`)
      .set(authHeader(customerToken))
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].url).toContain('https://');
  });

  it('deletes an attachment as admin', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/shipments/${shipmentId}/attachments/${attachmentId}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(storageServiceMock.remove).toHaveBeenCalled();
  });
});
