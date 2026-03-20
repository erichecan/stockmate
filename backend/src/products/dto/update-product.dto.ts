// Updated: 2026-02-27T04:30:00
// Updated: 2026-03-20T20:18:00 - PATCH 允许 brandId: null 以取消品牌关联
import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

class UpdateProductFields extends PartialType(
  OmitType(CreateProductDto, ['brandId'] as const),
) {}

export class UpdateProductDto extends UpdateProductFields {
  @ApiPropertyOptional({ nullable: true, description: '传 null 清除品牌' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  brandId?: string | null;
}
