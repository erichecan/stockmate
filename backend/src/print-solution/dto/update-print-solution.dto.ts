// 打印方案 - 更新 DTO
// Updated: 2026-03-14
import { PartialType } from '@nestjs/swagger';
import { CreatePrintSolutionDto } from './create-print-solution.dto';

export class UpdatePrintSolutionDto extends PartialType(CreatePrintSolutionDto) {}
