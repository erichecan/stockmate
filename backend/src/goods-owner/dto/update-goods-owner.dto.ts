// 货主 - 更新 DTO（部分字段可选）
// Updated: 2026-03-14
import { PartialType } from '@nestjs/swagger';
import { CreateGoodsOwnerDto } from './create-goods-owner.dto';

export class UpdateGoodsOwnerDto extends PartialType(CreateGoodsOwnerDto) {}
