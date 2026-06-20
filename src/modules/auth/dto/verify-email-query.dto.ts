import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailQueryDto {
  @ApiProperty({ description: 'Email verification token from inbox link' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
