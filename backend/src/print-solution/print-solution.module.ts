// 打印方案模块；参考 ModernWMS PrintSolution，出库单/入库单/拣货单
// Updated: 2026-03-14
import { Module } from '@nestjs/common';
import { PrintSolutionService } from './print-solution.service';
import { PrintSolutionController } from './print-solution.controller';

@Module({
  controllers: [PrintSolutionController],
  providers: [PrintSolutionService],
  exports: [PrintSolutionService],
})
export class PrintSolutionModule {}
