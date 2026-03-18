// Updated: 2026-03-17T12:00:00 - 现金账：关柜
import { IsNumber, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CloseSessionDto {
  @ApiPropertyOptional({ description: 'Closing cash amount (actual count)' })
  @IsNumber()
  @IsOptional()
  closingCash?: number;
}
