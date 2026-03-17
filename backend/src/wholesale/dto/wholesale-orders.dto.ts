// Updated: 2026-03-16T23:55:00 - P0 闭环: 添加 class-validator 装饰器
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

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

