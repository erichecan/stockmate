// Updated: 2026-03-20T11:35:42 - 收款登记 DTO（支持 DEBIT_CARD）
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: '客户 ID' })
  @IsString()
  customerId!: string;

  @ApiProperty({ description: '收款金额', example: 120.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod, description: '收款方式' })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ description: '参考号（转账号/票据号等）' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '收款时间，默认当前时间' })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
