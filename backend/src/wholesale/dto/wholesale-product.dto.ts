// Updated: 2026-03-14T16:05:00 - 批发站 P0: 商品列表/详情 DTO（公共版 + 登录版）
import { ApiProperty } from '@nestjs/swagger';

export class PublicProductListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  nameEn?: string | null;

  @ApiProperty({ required: false, type: [String] })
  images?: string[] | null;

  @ApiProperty({ required: false })
  categoryName?: string | null;

  @ApiProperty({ required: false })
  brandName?: string | null;
}

export class PublicProductDetailDto extends PublicProductListItemDto {
  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty({ required: false })
  descriptionEn?: string | null;
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export class WholesaleSkuDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ required: false, type: Object })
  variantAttributes?: Record<string, string>;

  @ApiProperty()
  wholesalePrice: number;

  @ApiProperty()
  minOrderQty: number;

  @ApiProperty({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] })
  stockStatus: StockStatus;
}

export class WholesaleProductListItemDto extends PublicProductListItemDto {
  @ApiProperty({ type: [WholesaleSkuDto] })
  skus: WholesaleSkuDto[];
}

export class WholesaleProductDetailDto extends WholesaleProductListItemDto {
  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty({ required: false })
  descriptionEn?: string | null;
}
