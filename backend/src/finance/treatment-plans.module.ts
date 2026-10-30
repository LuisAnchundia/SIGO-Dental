import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Module,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Role, TreatmentPlanStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

class PlanItemDto {
  @ApiProperty()
  @IsString()
  procedureId: string;

  @ApiPropertyOptional({ example: 1, description: 'Fase / sesión' })
  @IsOptional()
  @IsInt()
  @Min(1)
  phase?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toothNumber?: string;

  @ApiProperty({ example: 80 })
  @IsNumber()
  @Min(0)
  fee: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  labCost?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

class CreatePlanDto {
  @ApiProperty()
  @IsString()
  dentistId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PlanItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PlanItemDto)
  items: PlanItemDto[];
}

class ApproveDto {
  @ApiPropertyOptional({ type: [String], description: 'Ítems a aprobar' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[];

  @ApiPropertyOptional({ description: 'Aprobar todo el presupuesto' })
  @IsOptional()
  @IsBoolean()
  approveAll?: boolean;
}

@Injectable()
export class TreatmentPlansService {
  constructor(private readonly prisma: PrismaService) {}

  create(patientId: string, dto: CreatePlanDto) {
    return this.prisma.treatmentPlan.create({
      data: {
        patientId,
        dentistId: dto.dentistId,
        notes: dto.notes,
        status: TreatmentPlanStatus.PRESENTADO,
        items: {
          create: dto.items.map((i) => ({
            procedureId: i.procedureId,
            phase: i.phase ?? 1,
            toothNumber: i.toothNumber,
            fee: i.fee,
            labCost: i.labCost ?? 0,
            discount: i.discount ?? 0,
          })),
        },
      },
      include: { items: { include: { procedure: true } } },
    });
  }

  findByPatient(patientId: string) {
    return this.prisma.treatmentPlan.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { procedure: true } } },
    });
  }

  // RF-08: aprobación total o parcial; los ítems aprobados quedan agendables.
  async approve(id: string, dto: ApproveDto) {
    const plan = await this.prisma.treatmentPlan.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!plan) throw new NotFoundException('Presupuesto no encontrado');

    const approveIds = dto.approveAll
      ? plan.items.map((i) => i.id)
      : (dto.itemIds ?? []);

    await this.prisma.treatmentItem.updateMany({
      where: { id: { in: approveIds }, planId: id },
      data: { isApproved: true },
    });

    const items = await this.prisma.treatmentItem.findMany({
      where: { planId: id },
    });
    const approvedCount = items.filter((i) => i.isApproved).length;
    const status =
      approvedCount === 0
        ? TreatmentPlanStatus.PRESENTADO
        : approvedCount === items.length
          ? TreatmentPlanStatus.APROBADO_TOTAL
          : TreatmentPlanStatus.APROBADO_PARCIAL;

    return this.prisma.treatmentPlan.update({
      where: { id },
      data: { status },
      include: { items: { include: { procedure: true } } },
    });
  }
}

@ApiTags('Presupuestos / Planes de tratamiento (RF-07, RF-08)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
class TreatmentPlansController {
  constructor(private readonly service: TreatmentPlansService) {}

  @Get('patients/:patientId/treatment-plans')
  @ApiOperation({ summary: 'Listar presupuestos del paciente' })
  find(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Post('patients/:patientId/treatment-plans')
  @Roles(Role.ADMIN_TI, Role.ODONTOLOGO)
  @ApiOperation({ summary: 'Crear presupuesto multinivel' })
  create(@Param('patientId') patientId: string, @Body() dto: CreatePlanDto) {
    return this.service.create(patientId, dto);
  }

  @Patch('treatment-plans/:id/approve')
  @Roles(Role.ADMIN_TI, Role.ODONTOLOGO, Role.RECEPCION)
  @ApiOperation({ summary: 'Aprobar presupuesto (total o parcial)' })
  approve(@Param('id') id: string, @Body() dto: ApproveDto) {
    return this.service.approve(id, dto);
  }
}

@Module({
  controllers: [TreatmentPlansController],
  providers: [TreatmentPlansService],
})
export class TreatmentPlansModule {}
