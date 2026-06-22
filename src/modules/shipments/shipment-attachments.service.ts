import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttachmentType as PrismaAttachmentType } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { Role } from '@/common/enums/role.enum';
import { AttachmentType } from '@/common/enums/attachment-type.enum';
import { StorageService } from '@/infrastructure/storage/storage.service';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  buildShipmentStoragePath,
  MAX_UPLOAD_SIZE_BYTES,
} from '@/infrastructure/storage/storage.constants';

interface UploadActor {
  userId: string;
  role: Role;
  companyId?: string | null;
}

@Injectable()
export class ShipmentAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async upload(
    shipmentId: string,
    file: Express.Multer.File,
    type: AttachmentType,
    actor: UploadActor,
  ) {
    this.validateFile(file);

    const shipment = await this.getShipmentOrThrow(shipmentId);
    await this.assertCanUpload(shipment, actor);

    const path = buildShipmentStoragePath(
      shipment.companyId,
      shipment.id,
      file.originalname,
    );

    await this.storageService.upload(path, file.buffer, file.mimetype);

    const attachment = await this.prisma.shipmentAttachment.create({
      data: {
        shipmentId: shipment.id,
        uploadedBy: actor.userId,
        type: type as PrismaAttachmentType,
        path,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    const url = await this.storageService.createSignedUrl(path);

    return { ...attachment, url };
  }

  async list(shipmentId: string, actor: UploadActor) {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    await this.assertCanView(shipment, actor);

    const attachments = await this.prisma.shipmentAttachment.findMany({
      where: { shipmentId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    return Promise.all(
      attachments.map(async (attachment) => ({
        ...attachment,
        url: await this.storageService.createSignedUrl(attachment.path),
      })),
    );
  }

  async remove(shipmentId: string, attachmentId: string, actor: UploadActor) {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    await this.assertCanUpload(shipment, actor);

    const attachment = await this.prisma.shipmentAttachment.findFirst({
      where: { id: attachmentId, shipmentId },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.storageService.remove(attachment.path);
    await this.prisma.shipmentAttachment.delete({
      where: { id: attachment.id },
    });

    return { message: 'Attachment deleted' };
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException('File exceeds 5MB limit');
    }

    if (
      !ALLOWED_UPLOAD_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Unsupported file type');
    }
  }

  private async getShipmentOrThrow(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { driver: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    return shipment;
  }

  private async assertCanUpload(
    shipment: {
      companyId: string;
      driverId: string | null;
      driver: { userId: string } | null;
    },
    actor: UploadActor,
  ): Promise<void> {
    if (actor.role === Role.ADMIN) {
      if (actor.companyId && shipment.companyId !== actor.companyId) {
        throw new ForbiddenException(
          'Shipment does not belong to your company',
        );
      }
      return;
    }

    if (actor.role === Role.DRIVER) {
      if (shipment.driver?.userId !== actor.userId) {
        throw new ForbiddenException(
          'Drivers can only upload files for assigned shipments',
        );
      }
      return;
    }

    throw new ForbiddenException('You cannot upload files for this shipment');
  }

  private async assertCanView(
    shipment: {
      companyId: string;
      customerId: string;
      driver: { userId: string } | null;
    },
    actor: UploadActor,
  ): Promise<void> {
    if (actor.role === Role.ADMIN) {
      if (actor.companyId && shipment.companyId !== actor.companyId) {
        throw new ForbiddenException(
          'Shipment does not belong to your company',
        );
      }
      return;
    }

    if (actor.role === Role.CUSTOMER && shipment.customerId === actor.userId) {
      return;
    }

    if (
      actor.role === Role.DRIVER &&
      shipment.driver?.userId === actor.userId
    ) {
      return;
    }

    throw new ForbiddenException(
      'You cannot view attachments for this shipment',
    );
  }
}
