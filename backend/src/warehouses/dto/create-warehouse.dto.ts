// Updated: 2026-02-28T10:00:00
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Main Warehouse' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'WH01' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ example: '123 Industrial Ave' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Shanghai' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'China' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: false, description: 'Set as default warehouse' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
