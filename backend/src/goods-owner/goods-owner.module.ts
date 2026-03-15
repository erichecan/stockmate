// 货主模块；参考 ModernWMS Goodsowner
// Updated: 2026-03-14
import { Module } from '@nestjs/common';
import { GoodsOwnerService } from './goods-owner.service';
import { GoodsOwnerController } from './goods-owner.controller';

@Module({
  controllers: [GoodsOwnerController],
  providers: [GoodsOwnerService],
  exports: [GoodsOwnerService],
})
export class GoodsOwnerModule {}
