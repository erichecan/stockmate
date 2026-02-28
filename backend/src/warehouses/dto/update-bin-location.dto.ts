// Updated: 2026-02-28T10:00:00
import { PartialType } from '@nestjs/swagger';
import { CreateBinLocationDto } from './create-bin-location.dto';

export class UpdateBinLocationDto extends PartialType(CreateBinLocationDto) {}
