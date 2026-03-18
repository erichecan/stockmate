// Updated: 2026-03-17T14:31:00 - SKU MOQ 单条更新 DTO
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateSkuMoqDto {
  @ApiProperty({
    description: 'Minimum order quantity',
    example: 6,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  moq!: number;
}
