// 库存冻结单模块
// Updated: 2026-03-14
import { Module } from '@nestjs/common';
import { StockFreezeService } from './stock-freeze.service';
import { StockFreezeController } from './stock-freeze.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockFreezeController],
  providers: [StockFreezeService],
  exports: [StockFreezeService],
})
export class StockFreezeModule {}
