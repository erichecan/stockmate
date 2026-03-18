// Updated: 2026-03-17T12:00:00 - 到柜预报：PATCH 状态
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '@prisma/client';

export class PatchShipmentStatusDto {
  @ApiProperty({ enum: ShipmentStatus, description: 'Shipment status' })
  @IsEnum(ShipmentStatus)
  status!: ShipmentStatus;
}
