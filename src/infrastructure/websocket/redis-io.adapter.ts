import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';
import { getRedisConnectionOptions } from '../redis/redis.config';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  async connect(): Promise<void> {
    const configService = this.app.get(ConfigService);
    const enabled =
      configService.get<string>('redis.websocketAdapter') !== 'false';

    if (!enabled) {
      this.logger.warn(
        'WebSocket Redis adapter disabled — running in single-instance mode',
      );
      return;
    }

    const redisOptions = getRedisConnectionOptions(configService);
    if (!redisOptions.host) {
      this.logger.warn(
        'Redis is not configured — WebSocket broadcasts stay local to this instance',
      );
      return;
    }

    try {
      this.pubClient = new Redis({
        ...redisOptions,
        maxRetriesPerRequest: null,
        lazyConnect: true,
      });
      this.subClient = this.pubClient.duplicate();

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
      this.logger.log('Socket.IO Redis adapter enabled for horizontal scaling');
    } catch (error) {
      this.logger.warn(
        `Socket.IO Redis adapter unavailable — falling back to single-instance mode: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      await this.disconnect();
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options) as {
      adapter: (adapter: ReturnType<typeof createAdapter>) => void;
    };

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }

  async disconnect(): Promise<void> {
    await this.subClient?.quit();
    await this.pubClient?.quit();
    this.subClient = null;
    this.pubClient = null;
    this.adapterConstructor = null;
  }
}
