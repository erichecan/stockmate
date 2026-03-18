// Updated: 2026-03-17T12:00:00 - 现金账：开柜
import { IsNumber, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OpenSessionDto {
  @ApiPropertyOptional({ description: 'Opening cash amount' })
  @IsNumber()
  @IsOptional()
  openingCash?: number;
}
