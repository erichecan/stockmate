// Updated: 2026-02-28T10:00:00
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiProperty({ description: 'Purchase Order ID' })
  @IsUUID()
  @IsString()
  purchaseOrderId!: string;

  @ApiPropertyOptional({ example: 'CONT-001' })
  @IsString()
  @IsOptional()
  containerNo?: string;

  @ApiPropertyOptional({ example: 'Ever Given' })
  @IsString()
  @IsOptional()
  vesselName?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsDateString()
  @IsOptional()
  etd?: string;

  @ApiPropertyOptional({ example: '2026-03-20' })
  @IsDateString()
  @IsOptional()
  eta?: string;

  @ApiPropertyOptional({ example: 'Shanghai' })
  @IsString()
  @IsOptional()
  portOfLoading?: string;

  @ApiPropertyOptional({ example: 'Los Angeles' })
  @IsString()
  @IsOptional()
  portOfDischarge?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsNumber()
  @IsOptional()
  shippingCost?: number;
}
