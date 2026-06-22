import { BadRequestException } from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '@/database/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: {
    shipment: {
      groupBy: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    driver: {
      groupBy: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      shipment: {
        groupBy: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      driver: {
        groupBy: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    service = new AnalyticsService(prisma as unknown as PrismaService);
  });

  it('aggregates overview metrics', async () => {
    prisma.shipment.groupBy.mockResolvedValue([
      { status: ShipmentStatus.PENDING, _count: { id: 2 } },
      { status: ShipmentStatus.DELIVERED, _count: { id: 3 } },
      { status: ShipmentStatus.CANCELLED, _count: { id: 1 } },
    ]);
    prisma.driver.groupBy.mockResolvedValue([
      { availability: 'AVAILABLE', _count: { id: 2 } },
    ]);
    prisma.driver.count.mockResolvedValue(2);
    prisma.shipment.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    prisma.shipment.findMany.mockResolvedValue([
      {
        assignedAt: new Date('2026-06-19T10:00:00Z'),
        deliveredAt: new Date('2026-06-19T12:00:00Z'),
      },
    ]);

    const result = await service.getOverview('company-1');

    expect(result.summary.totalShipments).toBe(6);
    expect(result.summary.activeShipments).toBe(2);
    expect(result.summary.deliveryRate).toBe(60);
    expect(result.summary.avgDeliveryTimeHours).toBe(2);
    expect(result.shipmentsByStatus.PENDING).toBe(2);
    expect(result.last7Days.created).toBe(4);
  });

  it('requires company id', async () => {
    await expect(service.getOverview('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns driver performance ordered by deliveries', async () => {
    prisma.shipment.groupBy.mockResolvedValue([
      { driverId: 'driver-1', _count: { id: 5 } },
    ]);
    prisma.driver.findMany.mockResolvedValue([
      {
        id: 'driver-1',
        availability: 'AVAILABLE',
        user: {
          firstName: 'John',
          lastName: 'Driver',
          email: 'driver@leo.com',
        },
      },
    ]);

    const result = await service.getDriverPerformance('company-1');

    expect(result.drivers).toHaveLength(1);
    expect(result.drivers[0].deliveries).toBe(5);
    expect(result.drivers[0].name).toBe('John Driver');
  });
});
