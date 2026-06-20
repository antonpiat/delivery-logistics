import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TrackingService } from './tracking.service';

@WebSocketGateway({ namespace: 'tracking', cors: true })
export class TrackingGateway {
  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly trackingService: TrackingService) {}

  @SubscribeMessage('joinShipment')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { trackingCode: string },
  ) {
    const room = `shipment:${data.trackingCode}`;
    void client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    return { event: 'joined', data: { room } };
  }

  @SubscribeMessage('driverLocation')
  async handleLocation(
    @MessageBody()
    data: {
      trackingCode: string;
      shipmentId: string;
      driverId: string;
      lat: number;
      lng: number;
    },
  ) {
    const locationUpdate = await this.trackingService.recordLocation(
      data.shipmentId,
      data.driverId,
      data.lat,
      data.lng,
    );

    const room = `shipment:${data.trackingCode}`;
    this.server.to(room).emit('locationUpdate', {
      lat: data.lat,
      lng: data.lng,
      recordedAt: locationUpdate.recordedAt,
    });

    return { event: 'locationUpdate', data: locationUpdate };
  }
}
