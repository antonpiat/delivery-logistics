import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from '@/infrastructure/queue/queue.constants';

export interface NotificationJobData {
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  process(job: Job<NotificationJobData>): Promise<void> {
    this.logger.log(
      `Processing notification ${job.data.type} for user ${job.data.userId}`,
    );
    return Promise.resolve();
  }
}
