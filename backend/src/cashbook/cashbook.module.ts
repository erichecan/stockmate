// Updated: 2026-03-17T12:00:00 - 后端第三部分：现金账模块
import { Module } from '@nestjs/common';
import { CashbookService } from './cashbook.service';
import { CashbookController } from './cashbook.controller';

@Module({
  controllers: [CashbookController],
  providers: [CashbookService],
  exports: [CashbookService],
})
export class CashbookModule {}
