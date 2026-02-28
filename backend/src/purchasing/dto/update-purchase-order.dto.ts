// Updated: 2026-02-28T10:00:00
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { POStatus } from '@prisma/client';

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ enum: POStatus })
  @IsEnum(POStatus)
  @IsOptional()
  status?: POStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: '2026-03-15' })
  @IsDateString()
  @IsOptional()
  expectedAt?: string;
}
