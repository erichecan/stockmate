// Updated: 2026-02-28T10:00:00
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscrepancyType } from '@prisma/client';

export class CreateReceiptItemDto {
  @ApiProperty({ description: 'Purchase Order Item ID' })
  @IsUUID()
  @IsString()
  poItemId!: string;

  @ApiProperty({ example: 100, minimum: 0, description: 'Received quantity' })
  @IsNumber()
  @Min(0)
  receivedQty!: number;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  damagedQty?: number = 0;

  @ApiPropertyOptional({ enum: DiscrepancyType })
  @IsEnum(DiscrepancyType)
  @IsOptional()
  discrepancyType?: DiscrepancyType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
