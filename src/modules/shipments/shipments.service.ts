import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Shipment,
  ShipmentStatus as PrismaShipmentStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/database/prisma.service';
import { Role } from '@/common/enums/role.enum';
import { ShipmentStatus } from '@/common/enums/shipment-status.enum';
import { NotificationType } from '@/common/enums/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import {
  buildCursorPaginatedResult,
  CursorPaginationParams,
  getPaginationArgs,
} from '@/common/utils/pagination.util';
import {
  assertDriverTransition,
  assertTransitionContext,
  assertValidTransition,
} from './shipment-state-machine';

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

  findByCompany(companyId: string, pagination: CursorPaginationParams = {}) {
    const { limit, take, cursorFilter, orderBy } =
      getPaginationArgs(pagination);

    return this.prisma.shipment
      .findMany({
        where: {
          companyId,
          ...(cursorFilter ?? {}),
        },
        include: {
          customer: {
            select: { email: true, firstName: true, lastName: true },
          },
          driver: {
            include: {
              user: {
                select: { email: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy,
        take,
      })
      .then((items) => buildCursorPaginatedResult(items, limit));
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
    actor: { role: Role; userId: string; companyId?: string | null },
  ): Promise<Shipment> {
    const existing = await this.findById(id);

    if (actor.companyId && existing.companyId !== actor.companyId) {
      throw new ForbiddenException('Shipment does not belong to your company');
    }

    const currentStatus = existing.status as ShipmentStatus;
    const nextStatus = dto.status;

    this.validateTransition(currentStatus, nextStatus, {
      driverId: dto.driverId,
      existingDriverId: existing.driverId,
    });

    if (actor.role === Role.DRIVER) {
      await this.assertDriverCanUpdate(
        existing,
        actor.userId,
        currentStatus,
        nextStatus,
      );
    }

    const driverId = this.resolveDriverId(
      nextStatus,
      dto.driverId,
      existing.driverId,
    );

    if (dto.driverId) {
      await this.assertDriverBelongsToCompany(dto.driverId, existing.companyId);
    }

    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: nextStatus,
        driverId,
        assignedAt:
          nextStatus === ShipmentStatus.ASSIGNED
            ? new Date()
            : existing.assignedAt,
        deliveredAt:
          nextStatus === ShipmentStatus.DELIVERED
            ? new Date()
            : existing.deliveredAt,
        statusHistory: {
          create: {
            fromStatus: currentStatus,
            toStatus: nextStatus,
          },
        },
      },
    });

    await this.dispatchStatusNotifications(
      updated,
      currentStatus,
      nextStatus,
      driverId,
    );

    return updated;
  }

  private async dispatchStatusNotifications(
    shipment: Shipment,
    fromStatus: ShipmentStatus,
    toStatus: ShipmentStatus,
    driverId: string | null,
  ): Promise<void> {
    const payload = {
      shipmentId: shipment.id,
      trackingCode: shipment.trackingCode,
      fromStatus,
      toStatus,
      pickupAddress: shipment.pickupAddress,
      deliveryAddress: shipment.deliveryAddress,
    };

    const customerType =
      toStatus === ShipmentStatus.DELIVERED
        ? NotificationType.DELIVERED
        : NotificationType.STATUS_CHANGED;

    await this.notificationsService.create(
      shipment.customerId,
      customerType,
      payload,
    );

    if (toStatus === ShipmentStatus.ASSIGNED && driverId) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: driverId },
        select: { userId: true },
      });

      if (driver) {
        await this.notificationsService.create(
          driver.userId,
          NotificationType.SHIPMENT_ASSIGNED,
          payload,
        );
      }
    }
  }

  private validateTransition(
    from: ShipmentStatus,
    to: ShipmentStatus,
    context: { driverId?: string; existingDriverId: string | null },
  ): void {
    try {
      assertValidTransition(from, to);
      assertTransitionContext(to, context);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid status transition',
      );
    }
  }

  private async assertDriverCanUpdate(
    shipment: Shipment,
    userId: string,
    from: ShipmentStatus,
    to: ShipmentStatus,
  ): Promise<void> {
    try {
      assertDriverTransition(from, to);
    } catch (error) {
      throw new ForbiddenException(
        error instanceof Error ? error.message : 'Transition not allowed',
      );
    }

    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new ForbiddenException('Driver profile not found');
    }

    if (shipment.driverId !== driver.id) {
      throw new ForbiddenException(
        'Drivers can only update shipments assigned to them',
      );
    }
  }

  private async assertDriverBelongsToCompany(
    driverId: string,
    companyId: string,
  ): Promise<void> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    if (driver.companyId !== companyId) {
      throw new BadRequestException(
        'Driver does not belong to the shipment company',
      );
    }
  }

  private resolveDriverId(
    nextStatus: ShipmentStatus,
    driverId: string | undefined,
    existingDriverId: string | null,
  ): string | null {
    if (nextStatus === ShipmentStatus.CANCELLED) {
      return existingDriverId;
    }

    return driverId ?? existingDriverId;
  }
}
