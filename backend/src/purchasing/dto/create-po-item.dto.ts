// Updated: 2026-02-28T10:00:00
import { IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePOItemDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsUUID()
  @IsString()
  skuId!: string;

  @ApiProperty({ example: 100, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 9.99, minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}
