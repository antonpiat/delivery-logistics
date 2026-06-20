import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, {
  jwtConfig,
  mailConfig,
  redisConfig,
  supabaseConfig,
} from './configuration';
import { envValidationSchema } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, jwtConfig, redisConfig, supabaseConfig, mailConfig],
      validationSchema: envValidationSchema,
    }),
  ],
})
export class AppConfigModule {}
