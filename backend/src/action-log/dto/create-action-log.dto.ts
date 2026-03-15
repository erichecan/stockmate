// 操作日志创建 DTO - 阶段一底座整合
// Updated: 2026-03-14
import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActionLogDto {
  @ApiProperty({ description: '操作类型，如 inbound, outbound, adjust' })
  @IsString()
  action: string;

  @ApiProperty({ description: '实体类型，如 InventoryItem, PurchaseOrder' })
  @IsString()
  entityType: string;

  @ApiPropertyOptional({ description: '实体 ID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: '附加数据' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
