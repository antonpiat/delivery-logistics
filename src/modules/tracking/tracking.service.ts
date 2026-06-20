import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async recordLocation(
    shipmentId: string,
    driverId: string,
    lat: number,
    lng: number,
  ) {
    const [locationUpdate] = await this.prisma.$transaction([
      this.prisma.locationUpdate.create({
        data: { shipmentId, driverId, lat, lng },
      }),
      this.prisma.driver.update({
        where: { id: driverId },
        data: { currentLat: lat, currentLng: lng },
      }),
    ]);

    return locationUpdate;
  }

  getShipmentHistory(shipmentId: string) {
    return this.prisma.locationUpdate.findMany({
      where: { shipmentId },
      orderBy: { recordedAt: 'asc' },
    });
  }
}
