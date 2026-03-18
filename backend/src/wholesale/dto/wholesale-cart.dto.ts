// Updated: 2026-03-16T23:30:00 - P0 闭环: 购物车 DTO 增加 skuCode/productName 供前端展示
import { ApiProperty } from '@nestjs/swagger';

export type StockStatusDto = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export class WholesaleCartItemDto {
  @ApiProperty()
  skuId!: string;

  @ApiProperty()
  skuCode!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  variantLabel!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  wholesalePrice!: number;

  @ApiProperty()
  minOrderQty!: number;

  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] })
  stockStatus!: StockStatusDto;
}

import { IsInt, IsString, IsUUID } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  skuId!: string;

  @ApiProperty({ description: '目标数量（<=0 表示从购物车中移除该 SKU）' })
  @IsInt()
  quantity!: number;
}
