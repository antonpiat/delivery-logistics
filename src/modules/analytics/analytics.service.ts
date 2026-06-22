import { BadRequestException, Injectable } from '@nestjs/common';
import { DriverAvailability, Prisma, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

const MS_PER_HOUR = 60 * 60 * 1000;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(companyId: string) {
    this.assertCompanyId(companyId);

    const sevenDaysAgo = this.daysAgo(7);

    const [
      statusGroups,
      driverAvailabilityGroups,
      totalDrivers,
      createdLast7Days,
      deliveredLast7Days,
      deliveredWithTimings,
    ] = await Promise.all([
      this.prisma.shipment.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { id: true },
      }),
      this.prisma.driver.groupBy({
        by: ['availability'],
        where: { companyId },
        _count: { id: true },
      }),
      this.prisma.driver.count({ where: { companyId } }),
      this.prisma.shipment.count({
        where: { companyId, createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.shipment.count({
        where: {
          companyId,
          status: ShipmentStatus.DELIVERED,
          deliveredAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.shipment.findMany({
        where: {
          companyId,
          status: ShipmentStatus.DELIVERED,
          assignedAt: { not: null },
          deliveredAt: { not: null },
        },
        select: { assignedAt: true, deliveredAt: true },
      }),
    ]);

    const shipmentsByStatus = this.toStatusMap(statusGroups);
    const totalShipments = Object.values(shipmentsByStatus).reduce(
      (sum, count) => sum + count,
      0,
    );
    const delivered = shipmentsByStatus[ShipmentStatus.DELIVERED] ?? 0;
    const cancelled = shipmentsByStatus[ShipmentStatus.CANCELLED] ?? 0;
    const completedTotal = totalShipments - cancelled;

    return {
      summary: {
        totalShipments,
        activeShipments: totalShipments - delivered - cancelled,
        deliveryRate:
          completedTotal > 0
            ? Math.round((delivered / completedTotal) * 1000) / 10
            : 0,
        avgDeliveryTimeHours: this.averageDeliveryHours(deliveredWithTimings),
      },
      shipmentsByStatus,
      drivers: {
        total: totalDrivers,
        byAvailability: this.toAvailabilityMap(driverAvailabilityGroups),
      },
      last7Days: {
        created: createdLast7Days,
        delivered: deliveredLast7Days,
      },
    };
  }

  async getShipmentTrend(companyId: string, days: number) {
    this.assertCompanyId(companyId);

    const since = this.daysAgo(days);

    const rows = await this.prisma.$queryRaw<
      Array<{ date: Date; created: bigint; delivered: bigint }>
    >(Prisma.sql`
      WITH days AS (
        SELECT generate_series(
          DATE_TRUNC('day', ${since}::timestamptz),
          DATE_TRUNC('day', NOW()),
          INTERVAL '1 day'
        ) AS day
      )
      SELECT
        d.day::date AS date,
        (
          SELECT COUNT(*)::bigint
          FROM "Shipment" s
          WHERE s."companyId" = ${companyId}
            AND s."createdAt" >= d.day
            AND s."createdAt" < d.day + INTERVAL '1 day'
        ) AS created,
        (
          SELECT COUNT(*)::bigint
          FROM "Shipment" s
          WHERE s."companyId" = ${companyId}
            AND s.status = 'DELIVERED'
            AND s."deliveredAt" >= d.day
            AND s."deliveredAt" < d.day + INTERVAL '1 day'
        ) AS delivered
      FROM days d
      ORDER BY d.day ASC
    `);

    return {
      days,
      points: rows.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        created: Number(row.created),
        delivered: Number(row.delivered),
      })),
    };
  }

  async getDriverPerformance(companyId: string) {
    this.assertCompanyId(companyId);

    const deliveryCounts = await this.prisma.shipment.groupBy({
      by: ['driverId'],
      where: {
        companyId,
        status: ShipmentStatus.DELIVERED,
        driverId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const driverIds = deliveryCounts
      .map((row) => row.driverId)
      .filter((id): id is string => id !== null);

    const drivers = await this.prisma.driver.findMany({
      where: { id: { in: driverIds } },
      select: {
        id: true,
        availability: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const driverMap = new Map(drivers.map((driver) => [driver.id, driver]));

    return {
      drivers: deliveryCounts.map((row) => {
        const driver = driverMap.get(row.driverId!);
        return {
          driverId: row.driverId,
          deliveries: row._count.id,
          availability: driver?.availability ?? DriverAvailability.OFFLINE,
          name: this.formatName(driver?.user),
          email: driver?.user.email ?? null,
        };
      }),
    };
  }

  private assertCompanyId(companyId: string): void {
    if (!companyId) {
      throw new BadRequestException('Admin must belong to a company');
    }
  }

  private daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * MS_PER_HOUR);
  }

  private toStatusMap(
    groups: Array<{ status: ShipmentStatus; _count: { id: number } }>,
  ): Record<ShipmentStatus, number> {
    return Object.values(ShipmentStatus).reduce(
      (acc, status) => {
        acc[status] =
          groups.find((group) => group.status === status)?._count.id ?? 0;
        return acc;
      },
      {} as Record<ShipmentStatus, number>,
    );
  }

  private toAvailabilityMap(
    groups: Array<{ availability: DriverAvailability; _count: { id: number } }>,
  ): Record<DriverAvailability, number> {
    return Object.values(DriverAvailability).reduce(
      (acc, availability) => {
        acc[availability] =
          groups.find((group) => group.availability === availability)?._count
            .id ?? 0;
        return acc;
      },
      {} as Record<DriverAvailability, number>,
    );
  }

  private averageDeliveryHours(
    shipments: Array<{ assignedAt: Date | null; deliveredAt: Date | null }>,
  ): number | null {
    if (shipments.length === 0) {
      return null;
    }

    const totalHours = shipments.reduce((sum, shipment) => {
      const hours =
        (shipment.deliveredAt!.getTime() - shipment.assignedAt!.getTime()) /
        MS_PER_HOUR;
      return sum + hours;
    }, 0);

    return Math.round((totalHours / shipments.length) * 10) / 10;
  }

  private formatName(user?: {
    firstName: string | null;
    lastName: string | null;
  }): string | null {
    if (!user) {
      return null;
    }

    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || null;
  }
}
