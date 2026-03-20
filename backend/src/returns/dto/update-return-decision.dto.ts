// Updated: 2026-03-19T15:06:21 - 退货处置决策 DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnDisposition, ReturnStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateReturnDecisionDto {
  @ApiProperty({ enum: ReturnDisposition })
  @IsEnum(ReturnDisposition)
  disposition!: ReturnDisposition;

  @ApiPropertyOptional({
    enum: ReturnStatus,
    description: '决策后状态（默认 DECIDED，可按流程更新为 PROCESSED）',
  })
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;

  @ApiPropertyOptional({ description: '处置决策备注' })
  @IsOptional()
  @IsString()
  decisionNotes?: string;
}
