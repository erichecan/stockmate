// Updated: 2026-02-27T04:30:00
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SkuVariantDto {
  @ApiProperty({
    description: 'Variant attributes',
    example: { color: 'Blue', material: 'Silicone' },
  })
  @IsObject()
  @IsNotEmpty()
  attributes!: Record<string, string>;

  @ApiPropertyOptional({ example: 15.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ example: 25.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  wholesalePrice?: number;

  @ApiPropertyOptional({ example: 39.9 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  retailPrice?: number;
}

export class BulkCreateSkuDto {
  @ApiProperty({ description: 'Product (SPU) ID' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ type: [SkuVariantDto], description: 'Variant combinations' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkuVariantDto)
  variants!: SkuVariantDto[];
}
