import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { MAX_UPLOAD_SIZE_BYTES } from '@/infrastructure/storage/storage.constants';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { ShipmentAttachmentsService } from './shipment-attachments.service';

@ApiTags('shipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shipments/:shipmentId/attachments')
export class ShipmentAttachmentsController {
  constructor(
    private readonly shipmentAttachmentsService: ShipmentAttachmentsService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Upload shipment attachment to Supabase Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          enum: ['PROOF_OF_DELIVERY', 'PICKUP_PHOTO', 'OTHER'],
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
    }),
  )
  upload(
    @Param('shipmentId') shipmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAttachmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.shipmentAttachmentsService.upload(
      shipmentId,
      file,
      dto.type,
      {
        userId: user.sub,
        role: user.role as Role,
        companyId: user.companyId,
      },
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.DRIVER, Role.CUSTOMER)
  @ApiOperation({ summary: 'List shipment attachments with signed URLs' })
  list(
    @Param('shipmentId') shipmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shipmentAttachmentsService.list(shipmentId, {
      userId: user.sub,
      role: user.role as Role,
      companyId: user.companyId,
    });
  }

  @Delete(':attachmentId')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Delete shipment attachment' })
  remove(
    @Param('shipmentId') shipmentId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shipmentAttachmentsService.remove(shipmentId, attachmentId, {
      userId: user.sub,
      role: user.role as Role,
      companyId: user.companyId,
    });
  }
}
