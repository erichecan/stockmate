// Updated: 2026-02-28T10:00:00
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InboundDto {
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

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Reference type (e.g. PO, RETURN)' })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference ID' })
  @IsString()
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
