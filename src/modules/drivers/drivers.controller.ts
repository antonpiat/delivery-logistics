import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CursorPaginationQueryDto } from '@/common/utils/cursor-pagination-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@ApiTags('drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List company drivers with cursor pagination' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: CursorPaginationQueryDto,
  ) {
    return this.driversService.findByCompany(user.companyId!, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Get driver by ID' })
  findOne(@Param('id') id: string) {
    return this.driversService.findById(id);
  }
}
