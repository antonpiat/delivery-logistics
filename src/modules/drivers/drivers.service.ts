import { Injectable, NotFoundException } from '@nestjs/common';
import { Driver } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import {
  buildCursorPaginatedResult,
  CursorPaginationParams,
  getPaginationArgs,
} from '@/common/utils/pagination.util';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  findByCompany(companyId: string, pagination: CursorPaginationParams = {}) {
    const { limit, take, cursorFilter, orderBy } =
      getPaginationArgs(pagination);

    return this.prisma.driver
      .findMany({
        where: {
          companyId,
          ...(cursorFilter ?? {}),
        },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
        orderBy,
        take,
      })
      .then((items) => buildCursorPaginatedResult(items, limit));
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
