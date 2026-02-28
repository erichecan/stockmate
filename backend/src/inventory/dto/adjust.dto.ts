// Updated: 2026-02-28T10:00:00
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  @IsNotEmpty()
  skuId!: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @ApiPropertyOptional({ description: 'Bin location ID' })
  @IsString()
  @IsOptional()
  binLocationId?: string;

  @ApiProperty({
    description: 'Quantity (positive for increase, negative for reduction)',
  })
  @IsInt()
  quantity!: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
