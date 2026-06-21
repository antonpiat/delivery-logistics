import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsTrendQueryDto } from './dto/analytics-trend-query.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin dashboard overview with aggregated metrics' })
  getOverview(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getOverview(user.companyId!);
  }

  @Get('shipments/trend')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Daily shipment creation and delivery trend' })
  getShipmentTrend(
    @CurrentUser() user: JwtPayload,
    @Query() query: AnalyticsTrendQueryDto,
  ) {
    return this.analyticsService.getShipmentTrend(
      user.companyId!,
      query.days ?? 30,
    );
  }

  @Get('drivers/performance')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Top drivers by completed deliveries' })
  getDriverPerformance(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getDriverPerformance(user.companyId!);
  }
}
