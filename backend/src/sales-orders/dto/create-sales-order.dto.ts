// Phase 3: Create Sales Order DTO
// Updated: 2026-02-28T14:20:00
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSalesOrderItemDto } from './create-sales-order-item.dto';

export class CreateSalesOrderDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  @IsUUID()
  customerId!: string;

  @ApiProperty({ description: 'Warehouse ID (ship-from warehouse)' })
  @IsString()
  @IsUUID()
  warehouseId!: string;

  @ApiPropertyOptional({ default: 'EUR' })
  @IsString()
  @IsOptional()
  currency?: string = 'EUR';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateSalesOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items!: CreateSalesOrderItemDto[];
}
