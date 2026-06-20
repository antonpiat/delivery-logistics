import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

export function getRedisConnectionOptions(
  configService: ConfigService,
): RedisOptions {
  const url = configService.get<string>('redis.url');

  if (url) {
    const parsed = new URL(url);

    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      username: parsed.username || undefined,
      password: parsed.password
        ? decodeURIComponent(parsed.password)
        : undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  }

  return {
    host: configService.get<string>('redis.host'),
    port: configService.get<number>('redis.port'),
    password: configService.get<string>('redis.password'),
    tls: configService.get<boolean>('redis.tls') ? {} : undefined,
  };
}
