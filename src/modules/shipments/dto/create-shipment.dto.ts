import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiProperty({ example: '123 Main St, City' })
  @IsString()
  pickupAddress: string;

  @ApiProperty({ example: '456 Oak Ave, City' })
  @IsString()
  deliveryAddress: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Customer user ID' })
  @IsString()
  customerId: string;
}
