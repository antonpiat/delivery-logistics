import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(companyId: string) {
    const [totalShipments, delivered, inTransit, drivers] = await Promise.all([
      this.prisma.shipment.count({ where: { companyId } }),
      this.prisma.shipment.count({
        where: { companyId, status: 'DELIVERED' },
      }),
      this.prisma.shipment.count({
        where: { companyId, status: 'IN_TRANSIT' },
      }),
      this.prisma.driver.count({ where: { companyId } }),
    ]);

    return {
      totalShipments,
      delivered,
      inTransit,
      pending: totalShipments - delivered - inTransit,
      totalDrivers: drivers,
    };
  }
}
