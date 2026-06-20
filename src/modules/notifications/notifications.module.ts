import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { NOTIFICATIONS_QUEUE } from '../../infrastructure/queue/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
