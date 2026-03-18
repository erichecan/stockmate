// Updated: 2026-03-17T14:31:00 - SKU MOQ 批量更新 DTO
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SkuMoqItemDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  skuId!: string;

  @ApiProperty({ description: 'Minimum order quantity', minimum: 1 })
  @IsInt()
  @Min(1)
  moq!: number;
}

export class BatchUpdateSkuMoqDto {
  @ApiProperty({ type: [SkuMoqItemDto], description: 'SKU MOQ updates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkuMoqItemDto)
  items!: SkuMoqItemDto[];
}
