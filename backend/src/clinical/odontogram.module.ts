import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
  Module,
  Injectable,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  Dentition,
  Role,
  ToothCondition,
  ToothSurface,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

// Marca una superficie dental (RF-03).
class UpsertToothDto {
  @ApiProperty({ example: '11', description: 'Diente en notación FDI' })
  @IsString()
  toothNumber: string;

  @ApiProperty({ enum: ToothSurface })
  @IsEnum(ToothSurface)
  surface: ToothSurface;

  @ApiProperty({ enum: ToothCondition })
  @IsEnum(ToothCondition)
  condition: ToothCondition;

  @ApiPropertyOptional({ enum: Dentition })
  @IsOptional()
  @IsEnum(Dentition)
  dentition?: Dentition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

@Injectable()
export class OdontogramService {
  constructor(private readonly prisma: PrismaService) {}

  findByPatient(patientId: string) {
    return this.prisma.toothRecord.findMany({
      where: { patientId },
      orderBy: { toothNumber: 'asc' },
    });
  }

  upsert(patientId: string, dto: UpsertToothDto, userId?: string) {
    const data = {
      condition: dto.condition,
      dentition: dto.dentition ?? Dentition.PERMANENTE,
      notes: dto.notes,
      recordedById: userId,
    };
    return this.prisma.toothRecord.upsert({
      where: {
        patientId_toothNumber_surface: {
          patientId,
          toothNumber: dto.toothNumber,
          surface: dto.surface,
        },
      },
      create: {
        patientId,
        toothNumber: dto.toothNumber,
        surface: dto.surface,
        ...data,
      },
      update: data,
    });
  }
}

@ApiTags('Odontograma (RF-03)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients/:patientId/odontogram')
class OdontogramController {
  constructor(private readonly service: OdontogramService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener el odontograma del paciente' })
  find(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Put()
  @Roles(Role.ADMIN_TI, Role.ODONTOLOGO, Role.ASISTENTE)
  @ApiOperation({ summary: 'Marcar una superficie dental' })
  upsert(
    @Param('patientId') patientId: string,
    @Body() dto: UpsertToothDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.upsert(patientId, dto, user.id);
  }
}

@Module({
  controllers: [OdontogramController],
  providers: [OdontogramService],
})
export class OdontogramModule {}
