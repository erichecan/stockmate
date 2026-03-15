// 货主 - 创建 DTO；参考 ModernWMS GoodsownerEntity
// Updated: 2026-03-14
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGoodsOwnerDto {
  @ApiProperty({ example: '品牌A代管' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'GO-001' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: '张三' })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ example: '13800138000' })
  @IsString()
  @IsOptional()
  contactTel?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
