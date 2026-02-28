// Updated: 2026-02-28T10:00:00
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateReceiptItemDto } from './create-receipt-item.dto';

export class CreateReceiptDto {
  @ApiProperty({ description: 'Purchase Order ID' })
  @IsUUID()
  @IsString()
  purchaseOrderId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateReceiptItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceiptItemDto)
  items!: CreateReceiptItemDto[];
}
