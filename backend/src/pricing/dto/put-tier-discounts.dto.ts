// Updated: 2026-03-17T14:32:00 - 等级折扣配置 PUT DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerTier } from '@prisma/client';

export class TierDiscountItemDto {
  @ApiProperty({ enum: CustomerTier })
  @IsEnum(CustomerTier)
  tier!: CustomerTier;

  @ApiProperty({
    description: 'Discount percent (e.g. 2 = 2% off)',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent!: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}

export class PutTierDiscountsDto {
  @ApiProperty({ type: [TierDiscountItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierDiscountItemDto)
  policies!: TierDiscountItemDto[];
}
