// Updated: 2026-03-17T12:00:00 - 现金账：入账
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashbookTransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ enum: CashbookTransactionType })
  @IsEnum(CashbookTransactionType)
  type!: CashbookTransactionType;

  @ApiProperty({ description: 'Amount (positive)' })
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Reference type (e.g. SO, PAYMENT)' })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference ID' })
  @IsString()
  @IsOptional()
  referenceId?: string;
}
