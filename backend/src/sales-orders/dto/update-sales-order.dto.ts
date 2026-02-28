// Phase 3: Update Sales Order DTO
// Updated: 2026-02-28T14:20:00
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSalesOrderDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
