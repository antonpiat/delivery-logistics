import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from '@/infrastructure/queue/queue.constants';
import { NotificationDeliveryService } from './notification-delivery.service';

export interface NotificationJobData {
  notificationId: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notificationDeliveryService: NotificationDeliveryService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    this.logger.log(
      `Delivering notification ${job.data.type} for user ${job.data.userId}`,
    );
    await this.notificationDeliveryService.deliver(job.data);
  }
}
