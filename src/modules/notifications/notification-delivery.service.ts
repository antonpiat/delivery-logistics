import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { MailService } from '@/infrastructure/mail/mail.service';
import { buildNotificationContent } from './notification-content';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationJobData } from './notifications.processor';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async deliver(job: NotificationJobData): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: job.userId },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      this.logger.warn(`Skipping notification — user ${job.userId} not found`);
      return;
    }

    const content = buildNotificationContent(job.type, job.payload);

    await Promise.all([
      this.deliverEmail(user.email, user.emailVerified, content),
      this.deliverPush(job, content),
    ]);
  }

  private async deliverEmail(
    email: string,
    emailVerified: boolean,
    content: { subject: string; html: string },
  ): Promise<void> {
    if (!emailVerified) {
      this.logger.warn(`Skipping email to ${email} — address not verified`);
      return;
    }

    try {
      await this.mailService.sendNotificationEmail(
        email,
        content.subject,
        content.html,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private deliverPush(
    job: NotificationJobData,
    content: { title: string; body: string },
  ): void {
    try {
      this.notificationsGateway.emitToUser(job.userId, {
        notificationId: job.notificationId,
        type: job.type,
        payload: job.payload,
        title: content.title,
        body: content.body,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to push notification to user ${job.userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
