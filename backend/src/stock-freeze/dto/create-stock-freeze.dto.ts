// 创建库存冻结单 DTO
// Updated: 2026-03-14
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockFreezeDto {
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

  @ApiProperty({ description: 'Freeze quantity', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Freeze reason' })
  @IsString()
  @IsOptional()
  reason?: string;
}
