import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Shipment,
  ShipmentStatus as PrismaShipmentStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/database/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ShipmentStatus } from '@/common/enums/shipment-status.enum';

@Injectable()
export class ShipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private generateTrackingCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  create(dto: CreateShipmentDto, companyId: string): Promise<Shipment> {
    return this.prisma.shipment.create({
      data: {
        trackingCode: this.generateTrackingCode(),
        companyId,
        customerId: dto.customerId,
        pickupAddress: dto.pickupAddress,
        deliveryAddress: dto.deliveryAddress,
        notes: dto.notes,
        statusHistory: {
          create: {
            toStatus: PrismaShipmentStatus.PENDING,
          },
        },
      },
    });
  }

  findByCompany(companyId: string): Promise<Shipment[]> {
    return this.prisma.shipment.findMany({
      where: { companyId },
      include: {
        customer: { select: { email: true, firstName: true, lastName: true } },
        driver: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Shipment> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        statusHistory: { orderBy: { changedAt: 'asc' } },
        locationLogs: { orderBy: { recordedAt: 'asc' } },
        customer: { select: { email: true, firstName: true, lastName: true } },
        driver: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    return shipment;
  }

  async findByTrackingCode(trackingCode: string): Promise<Shipment> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingCode },
      include: {
        statusHistory: { orderBy: { changedAt: 'asc' } },
        locationLogs: { orderBy: { recordedAt: 'asc' } },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${trackingCode} not found`);
    }

    return shipment;
  }

  async updateStatus(
    id: string,
    dto: UpdateShipmentStatusDto,
  ): Promise<Shipment> {
    const existing = await this.findById(id);

    return this.prisma.shipment.update({
      where: { id },
      data: {
        status: dto.status,
        driverId: dto.driverId ?? existing.driverId,
        assignedAt:
          dto.status === ShipmentStatus.ASSIGNED
            ? new Date()
            : existing.assignedAt,
        deliveredAt:
          dto.status === ShipmentStatus.DELIVERED
            ? new Date()
            : existing.deliveredAt,
        statusHistory: {
          create: {
            fromStatus: existing.status,
            toStatus: dto.status,
          },
        },
      },
    });
  }
}
