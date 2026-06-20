import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Module({
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
