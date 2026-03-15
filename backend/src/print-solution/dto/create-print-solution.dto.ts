// 打印方案 - 创建 DTO；参考 ModernWMS PrintSolutionEntity，支持出库单/入库单/拣货单
// Updated: 2026-03-14
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrintDocumentType } from '@prisma/client';

export class CreatePrintSolutionDto {
  @ApiProperty({ enum: PrintDocumentType, description: '出库单/入库单/拣货单' })
  @IsEnum(PrintDocumentType)
  documentType!: PrintDocumentType;

  @ApiProperty({ example: '默认出库单' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'HTML 模板内容，支持 {{orderNumber}} 等占位符' })
  @IsString()
  @IsNotEmpty()
  templateBody!: string;

  @ApiPropertyOptional({ description: '纸张宽度 mm' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  reportWidthMm?: number;

  @ApiPropertyOptional({ description: '纸张高度 mm' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  reportHeightMm?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
