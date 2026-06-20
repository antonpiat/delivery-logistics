import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@ApiTags('shipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a delivery order (Admin)' })
  create(@Body() dto: CreateShipmentDto, @CurrentUser() user: JwtPayload) {
    return this.shipmentsService.create(dto, user.companyId!);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all company shipments (Admin)' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.shipmentsService.findByCompany(user.companyId!);
  }

  @Get('track/:trackingCode')
  @Roles(Role.ADMIN, Role.CUSTOMER, Role.DRIVER)
  @ApiOperation({ summary: 'Track shipment by code' })
  track(@Param('trackingCode') trackingCode: string) {
    return this.shipmentsService.findByTrackingCode(trackingCode);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DRIVER, Role.CUSTOMER)
  @ApiOperation({ summary: 'Get shipment by ID' })
  findOne(@Param('id') id: string) {
    return this.shipmentsService.findById(id);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Update shipment status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateShipmentStatusDto) {
    return this.shipmentsService.updateStatus(id, dto);
  }
}
