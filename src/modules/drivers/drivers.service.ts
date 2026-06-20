import { Injectable, NotFoundException } from '@nestjs/common';
import { Driver } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  findByCompany(companyId: string): Promise<Driver[]> {
    return this.prisma.driver.findMany({
      where: { companyId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
  }

  async findById(id: string): Promise<Driver> {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`);
    }

    return driver;
  }
}
