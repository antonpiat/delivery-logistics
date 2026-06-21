import { ConfigService } from '@nestjs/config';
import { RedisIoAdapter } from './redis-io.adapter';

describe('RedisIoAdapter', () => {
  it('skips Redis adapter when disabled via config', async () => {
    const configService = {
      get: (key: string) =>
        key === 'redis.websocketAdapter' ? 'false' : undefined,
    } as ConfigService;

    const app = {
      get: (token: unknown) => {
        if (token === ConfigService) {
          return configService;
        }
        throw new Error('Unexpected token');
      },
    };

    const adapter = new RedisIoAdapter(app);
    await expect(adapter.connect()).resolves.toBeUndefined();
    await adapter.disconnect();
  });
});
