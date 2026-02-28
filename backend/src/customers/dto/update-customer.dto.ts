// Phase 3: Update Customer DTO
// Updated: 2026-02-28T14:05:00
import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
