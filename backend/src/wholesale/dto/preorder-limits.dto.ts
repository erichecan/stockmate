// Updated: 2026-03-18T22:49:30 - 修复 tier 字段白名单校验，支持等级限购入参
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
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
  @IsEnum(CustomerTier)
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
