// Updated: 2026-03-14T17:10:00 - 批发站 P0: 购物车 DTO（行结构与写入请求）
import { ApiProperty } from '@nestjs/swagger';

// 为避免装饰器元数据引入跨文件类型，这里单独定义 DTO 级别的库存状态类型
export type StockStatusDto = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export class WholesaleCartItemDto {
  @ApiProperty()
  skuId!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  wholesalePrice!: number;

  @ApiProperty()
  minOrderQty!: number;

  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] })
  stockStatus!: StockStatusDto;
}

export class AddCartItemDto {
  @ApiProperty()
  skuId!: string;

  @ApiProperty({
    description: '目标数量（<=0 表示从购物车中移除该 SKU）',
  })
  quantity!: number;
}

