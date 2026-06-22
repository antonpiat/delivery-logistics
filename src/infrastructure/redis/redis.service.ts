import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from './redis.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      ...getRedisConnectionOptions(this.configService),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    await this.client.connect();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy() {
    await this.client?.quit();
    this.logger.log('Redis disconnected');
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
