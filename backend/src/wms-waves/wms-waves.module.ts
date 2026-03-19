// Updated: 2026-03-18T23:32:25 - 正式 WMS 波次实体模块
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { WmsWavesController } from './wms-waves.controller';
import { WmsWavesService } from './wms-waves.service';

@Module({
  // Updated: 2026-03-19T11:39:20 - 波次状态变更推送通知依赖 NotificationsModule
  imports: [NotificationsModule],
  controllers: [WmsWavesController],
  providers: [WmsWavesService],
  exports: [WmsWavesService],
})
export class WmsWavesModule {}

