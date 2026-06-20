import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: SupabaseClient | null = null;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket =
      this.configService.get<string>('supabase.storageBucket') ??
      'delivery-assets';
  }

  onModuleInit() {
    const url = this.configService.get<string>('supabase.url');
    const key = this.configService.get<string>('supabase.serviceRoleKey');

    if (url && key) {
      this.client = createClient(url, key);
      this.logger.log('Supabase Storage client initialized');
    } else {
      this.logger.warn(
        'Supabase credentials not configured — storage disabled',
      );
    }
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  getBucket(): string {
    return this.bucket;
  }
}
