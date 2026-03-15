// Updated: 2026-03-14 - 阶段一：注入 ActionLogModule 用于操作日志打点
// 2026-03-14 阶段二收货：上架完成依赖 InventoryModule
import { Module } from '@nestjs/common';
import { ActionLogModule } from '../action-log/action-log.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PurchasingService } from './purchasing.service';
import { PurchasingController } from './purchasing.controller';

@Module({
  imports: [ActionLogModule, InventoryModule],
  controllers: [PurchasingController],
  providers: [PurchasingService],
  exports: [PurchasingService],
})
export class PurchasingModule {}
