import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

export interface PushNotificationPayload {
  notificationId: string;
  type: string;
  payload: Record<string, unknown>;
  title: string;
  body: string;
  createdAt: string;
}

@WebSocketGateway({ namespace: 'notifications', cors: true })
@Injectable()
export class NotificationsGateway {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  emitToUser(userId: string, payload: PushNotificationPayload): void {
    this.server.to(this.userRoom(userId)).emit('notification', payload);
    this.logger.log(
      `Push notification sent to user ${userId} (${payload.type})`,
    );
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const room = this.userRoom(data.userId);
    void client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    return { event: 'joined', data: { room } };
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }
}
