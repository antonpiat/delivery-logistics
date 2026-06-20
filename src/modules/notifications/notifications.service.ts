import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { NOTIFICATIONS_QUEUE } from '@/infrastructure/queue/queue.constants';
import { NotificationJobData } from './notifications.processor';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue<NotificationJobData>,
  ) {}

  async create(userId: string, type: string, payload: Record<string, unknown>) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        payload: payload as Prisma.InputJsonValue,
      },
    });

    await this.notificationsQueue.add('send-notification', {
      notificationId: notification.id,
      userId,
      type,
      payload,
    });

    return notification;
  }

  findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
