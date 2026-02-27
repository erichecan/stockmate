// Updated: 2026-02-27T04:30:00
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 16 PM 透明硅胶壳' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'iPhone 16 PM Clear Silicone Case' })
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiPropertyOptional({ example: '高品质透明硅胶保护壳' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'High quality clear silicone case' })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiProperty({ description: 'Category ID' })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiPropertyOptional({ description: 'Brand ID' })
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.DRAFT })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @ApiPropertyOptional({ type: [String], description: 'Image URLs' })
  @IsArray()
  @IsOptional()
  images?: string[];
}
