// Updated: 2026-02-28T10:00:00
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UnlockInventoryDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  @IsNotEmpty()
  skuId!: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @ApiProperty({ description: 'Quantity to unlock', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Reference type' })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference ID' })
  @IsString()
  @IsOptional()
  referenceId?: string;
}
