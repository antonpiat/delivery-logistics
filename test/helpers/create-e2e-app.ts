import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { MailService } from '@/infrastructure/mail/mail.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { mailServiceMock } from './mail.mock';
import { notificationsServiceMock } from './notifications.mock';
import { storageServiceMock } from './storage.mock';

export async function createE2eApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MailService)
    .useValue(mailServiceMock)
    .overrideProvider(StorageService)
    .useValue(storageServiceMock)
    .overrideProvider(NotificationsService)
    .useValue(notificationsServiceMock)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  await app.init();

  return app;
}
