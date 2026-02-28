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
import { CreatePOItemDto } from './create-po-item.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'Supplier ID' })
  @IsUUID()
  @IsString()
  supplierId!: string;

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreatePOItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePOItemDto)
  items!: CreatePOItemDto[];
}
