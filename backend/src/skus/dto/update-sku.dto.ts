// Updated: 2026-02-27T04:30:00
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSkuDto } from './create-sku.dto';

export class UpdateSkuDto extends PartialType(
  OmitType(CreateSkuDto, ['productId'] as const),
) {}
