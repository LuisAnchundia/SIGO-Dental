import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@sigodental.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin123*' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'Código TOTP si el usuario tiene MFA activo' })
  @IsOptional()
  @IsString()
  otp?: string;
}
