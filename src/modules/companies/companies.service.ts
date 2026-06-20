import { Injectable } from '@nestjs/common';
import { Company } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { name: string }): Promise<Company> {
    return this.prisma.company.create({ data });
  }

  findById(id: string): Promise<Company | null> {
    return this.prisma.company.findUnique({ where: { id } });
  }
}
