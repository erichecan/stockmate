// Updated: 2026-02-28T10:00:00
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBinLocationDto {
  @ApiProperty({ example: 'WH01-A-01-01-01' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ example: 'uuid-of-warehouse', description: 'Warehouse ID (injected from URL when using POST /:warehouseId/bins)' })
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsString()
  @IsOptional()
  zone?: string;

  @ApiPropertyOptional({ example: '01' })
  @IsString()
  @IsOptional()
  aisle?: string;

  @ApiPropertyOptional({ example: '01' })
  @IsString()
  @IsOptional()
  shelf?: string;

  @ApiPropertyOptional({ example: '01' })
  @IsString()
  @IsOptional()
  position?: string;
}
