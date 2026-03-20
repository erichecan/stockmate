// Updated: 2026-03-19T15:05:56 - 新建退货记录 DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnCondition } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateReturnRecordDto {
  @ApiPropertyOptional({ description: '来源订单 ID（可为空，支持先登记后匹配）' })
  @IsOptional()
  @IsString()
  sourceOrderId?: string;

  @ApiPropertyOptional({ description: '来源订单号（可手工录入）' })
  @IsOptional()
  @IsString()
  sourceOrderNumber?: string;

  @ApiPropertyOptional({ description: '退回 SKU ID（可为空，支持先登记后匹配）' })
  @IsOptional()
  @IsString()
  skuId?: string;

  @ApiProperty({ description: '退回数量', minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  returnedQty!: number;

  @ApiPropertyOptional({ enum: ReturnCondition, default: ReturnCondition.UNKNOWN })
  @IsOptional()
  @IsEnum(ReturnCondition)
  condition?: ReturnCondition;

  @ApiPropertyOptional({ description: '问题描述（例如：屏幕开裂、包装破损）' })
  @IsOptional()
  @IsString()
  issueDescription?: string;

  @ApiPropertyOptional({ description: '收货登记备注' })
  @IsOptional()
  @IsString()
  intakeNotes?: string;
}
