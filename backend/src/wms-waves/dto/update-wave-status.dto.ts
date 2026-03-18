// Updated: 2026-03-18T23:24:25 - WMS 波次状态更新 DTO
import { ApiProperty } from '@nestjs/swagger';
import { PickWaveStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateWaveStatusDto {
  @ApiProperty({ enum: PickWaveStatus })
  @IsEnum(PickWaveStatus)
  status!: PickWaveStatus;
}

