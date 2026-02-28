// Updated: 2026-02-28T10:00:00
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'ABC Supplier Inc.' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'SUP-001' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ example: 'John Smith' })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ example: 'contact@supplier.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-123-4567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main St, City' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'Net 30' })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiPropertyOptional({ example: 7, minimum: 0, description: 'Lead time in days' })
  @IsInt()
  @Min(0)
  @IsOptional()
  leadTimeDays?: number;
}
