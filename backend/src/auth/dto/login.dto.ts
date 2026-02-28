// 简化登录：公司标识可选，按邮箱自动推断租户
// Updated: 2026-02-28T15:00:00
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'my-company', description: '公司标识，可选；不填时按邮箱自动推断' })
  @IsString()
  @IsOptional()
  tenantSlug?: string;
}
