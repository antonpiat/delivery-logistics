import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    QueueModule,
    StorageModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    DriversModule,
    ShipmentsModule,
    TrackingModule,
    NotificationsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
