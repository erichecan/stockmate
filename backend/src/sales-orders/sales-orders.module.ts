// Phase 3: Sales Orders Module
// Updated: 2026-03-17T12:00:00 - 后端第三部分：出库通知
// Updated: 2026-03-17T14:33:00 - 注入 PricingModule 用于 getUnitPrice
import { Module } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service';
import { SalesOrdersController } from './sales-orders.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [InventoryModule, NotificationsModule, PricingModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
