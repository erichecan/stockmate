// Updated: 2026-03-18T23:24:10 - WMS 波次创建 DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateWaveDto {
  @ApiProperty({ type: [String], description: '需要合并进波次的订单 ID 列表' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderIds!: string[];

  @ApiPropertyOptional({ description: '指定仓库 ID（为空时自动使用订单仓库）' })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

