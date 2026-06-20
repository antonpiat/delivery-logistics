import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { RedisService } from '@/infrastructure/redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check() {
    let db: 'up' | 'down' = 'down';
    let redis: 'up' | 'down' = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }

    try {
      await this.redis.ping();
      redis = 'up';
    } catch {
      redis = 'down';
    }

    const status = db === 'up' && redis === 'up' ? 'ok' : 'degraded';

    return { status, db, redis };
  }
}
