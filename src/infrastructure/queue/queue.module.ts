import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NOTIFICATIONS_QUEUE } from './queue.constants';
import { getRedisConnectionOptions } from '../redis/redis.config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          ...getRedisConnectionOptions(configService),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
