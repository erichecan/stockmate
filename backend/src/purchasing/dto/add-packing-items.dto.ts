// Updated: 2026-02-28T10:00:00
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreatePackingListItemDto } from './create-packing-list-item.dto';

export class AddPackingItemsDto {
  @ApiProperty({ type: [CreatePackingListItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackingListItemDto)
  items!: CreatePackingListItemDto[];
}
