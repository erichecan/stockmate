// Updated: 2026-02-27T04:30:00
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkuDto {
  @ApiProperty({ description: 'Product (SPU) ID' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    description: 'Variant attributes',
    example: { color: 'Blue', material: 'Silicone' },
  })
  @IsObject()
  @IsNotEmpty()
  variantAttributes!: Record<string, string>;

  @ApiPropertyOptional({ example: '6941234567890' })
  @IsString()
  @IsOptional()
  barcode?: string;

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

  @ApiPropertyOptional({ example: 0.05, description: 'Weight in kg' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ type: [String], description: 'Image URLs' })
  @IsArray()
  @IsOptional()
  images?: string[];
}
