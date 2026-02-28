// Phase 3: Create Sales Order Item DTO
// Updated: 2026-02-28T14:20:00
import { IsInt, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSalesOrderItemDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  @IsUUID()
  skuId!: string;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
