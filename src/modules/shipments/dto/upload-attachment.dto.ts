import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttachmentType } from '@/common/enums/attachment-type.enum';

export class UploadAttachmentDto {
  @ApiProperty({ enum: AttachmentType, example: AttachmentType.PROOF_OF_DELIVERY })
  @IsEnum(AttachmentType)
  type: AttachmentType;
}
