// 库存冻结单列表查询 DTO
// Updated: 2026-03-14
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { StockFreezeStatus } from '@prisma/client';

export class StockFreezeQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Freeze status', enum: StockFreezeStatus })
  @IsOptional()
  @IsEnum(StockFreezeStatus)
  status?: StockFreezeStatus;

  @ApiPropertyOptional({ description: 'SKU ID' })
  @IsOptional()
  @IsString()
  skuId?: string;

  @ApiPropertyOptional({ description: 'Warehouse ID' })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}
