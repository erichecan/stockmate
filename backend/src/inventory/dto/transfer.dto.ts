// Updated: 2026-02-28T10:00:00
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  @IsNotEmpty()
  skuId!: string;

  @ApiProperty({ description: 'Source warehouse ID' })
  @IsString()
  @IsNotEmpty()
  fromWarehouseId!: string;

  @ApiProperty({ description: 'Destination warehouse ID' })
  @IsString()
  @IsNotEmpty()
  toWarehouseId!: string;

  @ApiPropertyOptional({ description: 'Source bin location ID' })
  @IsString()
  @IsOptional()
  fromBinLocationId?: string;

  @ApiPropertyOptional({ description: 'Destination bin location ID' })
  @IsString()
  @IsOptional()
  toBinLocationId?: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
