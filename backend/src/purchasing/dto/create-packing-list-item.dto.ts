// Updated: 2026-02-28T10:00:00
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePackingListItemDto {
  @ApiProperty({ example: 'CTN-001' })
  @IsString()
  cartonNo!: string;

  @ApiProperty({ example: 'SKU-ABC-001' })
  @IsString()
  skuCode!: string;

  @ApiPropertyOptional({ example: 'iPhone Case Clear' })
  @IsString()
  @IsOptional()
  skuName?: string;

  @ApiProperty({ example: 50, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 15.5 })
  @IsNumber()
  @IsOptional()
  grossWeight?: number;

  @ApiPropertyOptional({ example: 14.2 })
  @IsNumber()
  @IsOptional()
  netWeight?: number;

  @ApiPropertyOptional({ example: 0.08 })
  @IsNumber()
  @IsOptional()
  cbm?: number;
}
