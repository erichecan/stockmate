// Updated: 2026-03-17T14:30:00 - Admin 预售限购 DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerTier } from '@prisma/client';

export class PreorderTierLimitDto {
  @ApiProperty({ enum: CustomerTier })
  tier!: CustomerTier;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  maxQtyPerOrder!: number;
}

export class PutPreorderLimitsDto {
  @ApiPropertyOptional({
    description: '统一限购数量，null 表示删除',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.maxQtyPerOrder != null)
  @IsInt()
  @Min(1)
  maxQtyPerOrder?: number | null;

  @ApiPropertyOptional({
    type: [PreorderTierLimitDto],
    description: '等级限购（优先级高于统一配置）',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreorderTierLimitDto)
  tierLimits?: PreorderTierLimitDto[];
}
