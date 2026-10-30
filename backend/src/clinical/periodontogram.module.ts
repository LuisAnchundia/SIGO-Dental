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
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PerioSite, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// Medición por sitio (6 por diente) — RF-04.
class UpsertMeasurementDto {
  @ApiProperty({ example: '11' })
  @IsString()
  toothNumber: string;

  @ApiProperty({ enum: PerioSite })
  @IsEnum(PerioSite)
  site: PerioSite;

  @ApiProperty({ example: 3, description: 'Profundidad al sondaje (mm)' })
  @IsInt()
  @Min(0)
  @Max(15)
  probingDepth: number;

  @ApiProperty({ example: 0, description: 'Margen gingival (mm, negativo = recesión)' })
  @IsOptional()
  @IsInt()
  @Min(-10)
  @Max(10)
  gingivalMargin?: number;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  bleeding?: boolean;
}

// Movilidad y furca por diente.
class UpsertToothDto {
  @ApiProperty({ example: '11' })
  @IsString()
  toothNumber: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  @Max(3)
  mobility: number;

  @ApiProperty({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  furcation?: number;
}

@Injectable()
export class PeriodontogramService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPatient(patientId: string) {
    const [measurements, teeth] = await Promise.all([
      this.prisma.perioMeasurement.findMany({ where: { patientId } }),
      this.prisma.perioTooth.findMany({ where: { patientId } }),
    ]);
    return { measurements, teeth };
  }

  upsertMeasurement(patientId: string, dto: UpsertMeasurementDto) {
    const data = {
      probingDepth: dto.probingDepth,
      gingivalMargin: dto.gingivalMargin ?? 0,
      bleeding: dto.bleeding ?? false,
    };
    return this.prisma.perioMeasurement.upsert({
      where: {
        patientId_toothNumber_site: {
          patientId,
          toothNumber: dto.toothNumber,
          site: dto.site,
        },
      },
      create: { patientId, toothNumber: dto.toothNumber, site: dto.site, ...data },
      update: data,
    });
  }

  upsertTooth(patientId: string, dto: UpsertToothDto) {
    const data = { mobility: dto.mobility, furcation: dto.furcation ?? 0 };
    return this.prisma.perioTooth.upsert({
      where: {
        patientId_toothNumber: { patientId, toothNumber: dto.toothNumber },
      },
      create: { patientId, toothNumber: dto.toothNumber, ...data },
      update: data,
    });
  }
}

@ApiTags('Periodontograma (RF-04)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients/:patientId/periodontogram')
class PeriodontogramController {
  constructor(private readonly service: PeriodontogramService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener el periodontograma del paciente' })
  find(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Put('measurement')
  @Roles(Role.ADMIN_TI, Role.ODONTOLOGO, Role.ASISTENTE)
  @ApiOperation({ summary: 'Registrar sondaje de un sitio' })
  measurement(
    @Param('patientId') patientId: string,
    @Body() dto: UpsertMeasurementDto,
  ) {
    return this.service.upsertMeasurement(patientId, dto);
  }

  @Put('tooth')
  @Roles(Role.ADMIN_TI, Role.ODONTOLOGO, Role.ASISTENTE)
  @ApiOperation({ summary: 'Registrar movilidad / furca del diente' })
  tooth(@Param('patientId') patientId: string, @Body() dto: UpsertToothDto) {
    return this.service.upsertTooth(patientId, dto);
  }
}

@Module({
  controllers: [PeriodontogramController],
  providers: [PeriodontogramService],
})
export class PeriodontogramModule {}
