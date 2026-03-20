// Updated: 2026-03-19T15:06:54 - 查询退货记录 DTO
// Updated: 2026-03-20T18:22:10 - query 的 page/limit 为字符串，@Type 转 number 避免 @IsInt 失败导致 400
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReturnDisposition,
  ReturnStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryReturnRecordsDto {
  @ApiPropertyOptional({ enum: ReturnStatus })
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;

  @ApiPropertyOptional({ enum: ReturnDisposition })
  @IsOptional()
  @IsEnum(ReturnDisposition)
  disposition?: ReturnDisposition;

  @ApiPropertyOptional({ description: '订单号模糊搜索' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({ description: 'SKU 编码模糊搜索' })
  @IsOptional()
  @IsString()
  skuCode?: string;

  @ApiPropertyOptional({ description: '通用关键词（问题描述/备注）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
