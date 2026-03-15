// Updated: 2026-03-14 - 阶段一：注入 ActionLogModule 用于操作日志打点
import { Module } from '@nestjs/common';
import { ActionLogModule } from '../action-log/action-log.module';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [ActionLogModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
