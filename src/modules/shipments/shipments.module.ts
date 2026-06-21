import { Module } from '@nestjs/common';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { ShipmentAttachmentsController } from './shipment-attachments.controller';
import { ShipmentAttachmentsService } from './shipment-attachments.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ShipmentsController, ShipmentAttachmentsController],
  providers: [ShipmentsService, ShipmentAttachmentsService],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
