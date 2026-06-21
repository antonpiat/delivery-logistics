import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface UploadedObject {
  path: string;
}

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

  isConfigured(): boolean {
    return this.client !== null;
  }

  getBucket(): string {
    return this.bucket;
  }

  async upload(
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<UploadedObject> {
    const client = this.getClient();

    const { error } = await client.storage.from(this.bucket).upload(path, file, {
      contentType,
      upsert: false,
    });

    if (error) {
      this.logger.error(`Upload failed for ${path}: ${error.message}`);
      throw new ServiceUnavailableException('File upload failed');
    }

    this.logger.log(`Uploaded ${path} to ${this.bucket}`);
    return { path };
  }

  async remove(path: string): Promise<void> {
    const client = this.getClient();
    const { error } = await client.storage.from(this.bucket).remove([path]);

    if (error) {
      this.logger.error(`Delete failed for ${path}: ${error.message}`);
      throw new ServiceUnavailableException('File delete failed');
    }
  }

  async createSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    const client = this.getClient();
    const { data, error } = await client.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      this.logger.error(`Signed URL failed for ${path}: ${error?.message}`);
      throw new ServiceUnavailableException('Unable to create file URL');
    }

    return data.signedUrl;
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      throw new ServiceUnavailableException('Storage is not configured');
    }

    return this.client;
  }
}
