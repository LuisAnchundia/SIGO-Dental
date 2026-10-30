import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class MedicalHistoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemicDiseases?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  surgicalHistory?: string;

  @ApiPropertyOptional({ description: 'Alergias a fármacos' })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  coagulopathies?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAnticoagulated?: boolean;

  @ApiPropertyOptional({ description: 'Alergia a penicilina' })
  @IsOptional()
  @IsBoolean()
  penicillinAllergy?: boolean;
}

export class CreatePatientDto {
  @ApiProperty({ description: 'Cédula / identificación' })
  @IsString()
  documentId: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: '1990-05-20' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @ApiPropertyOptional({ description: 'Tutor legal si es menor de edad' })
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  insuranceNumber?: string;

  @ApiPropertyOptional({ type: MedicalHistoryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MedicalHistoryDto)
  medicalHistory?: MedicalHistoryDto;
}
