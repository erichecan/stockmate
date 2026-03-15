// Updated: 2026-03-14T17:15:00 - 批发站 P0: 从购物车生成订单的请求 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWholesaleOrderFromCartDto {
  @ApiPropertyOptional({
    description:
      '可选发货仓库 ID，不传则自动选择默认仓库（isDefault=true）或任意激活仓库',
  })
  warehouseId?: string;

  @ApiPropertyOptional({ description: '订单备注信息' })
  notes?: string;
}

