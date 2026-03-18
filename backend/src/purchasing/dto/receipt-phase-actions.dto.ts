// 阶段二收货流程：按阶段操作 DTO（参考 ModernWMS Asn confirm/unload/sorting/putaway）
// 2026-03-14

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ReceiptIdsDto {
  @ApiProperty({
    description: '收货单 ID 列表',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  receiptIds!: string[];
}

export class PutawayItemDto {
  @ApiPropertyOptional({ description: '收货明细 ID' })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  receiptItemId?: string;

  @ApiPropertyOptional({ description: '上架库位 ID' })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  binLocationId?: string;
}

export class PutawayCompleteDto {
  @ApiProperty({ description: '目标仓库 ID' })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  warehouseId!: string;

  @ApiPropertyOptional({
    description: '各明细上架库位（不传则不入库到具体库位）',
  })
  @IsOptional()
  @IsArray()
  items?: PutawayItemDto[];
}
