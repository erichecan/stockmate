// Updated: 2026-03-17T14:30:00 - 批发 DRAFT：MergeDraftDto, PatchDraftItemsDto
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWholesaleOrderFromCartDto {
  @ApiPropertyOptional({
    description:
      '可选发货仓库 ID，不传则自动选择默认仓库（isDefault=true）或任意激活仓库',
  })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: '订单备注信息' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MergeDraftDto {
  @ApiProperty({ type: [String], description: '要合并的订单 ID 列表' })
  @IsArray()
  @IsUUID('4', { each: true })
  orderIds!: string[];
}

export class PatchDraftItemDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsUUID()
  skuId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class PatchDraftItemsDto {
  @ApiProperty({ type: [PatchDraftItemDto], description: '全量订单行（覆盖）' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatchDraftItemDto)
  items!: PatchDraftItemDto[];
}
