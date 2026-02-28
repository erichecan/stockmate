// Updated: 2026-02-28T10:00:00
import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateShipmentDto } from './create-shipment.dto';

export class UpdateShipmentDto extends PartialType(
  OmitType(CreateShipmentDto, ['purchaseOrderId'] as const),
) {}
