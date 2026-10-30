import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
  Module,
  Injectable,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

// Horas tras las cuales la nota queda bloqueada (RF-05, configurable).
const LOCK_HOURS = Number(process.env.SOEP_LOCK_HOURS ?? 24);

class SoepDto {
  @ApiProperty({ description: 'Subjetivo' })
  @IsString()
  subjective: string;

  @ApiProperty({ description: 'Objetivo' })
  @IsString()
  objective: string;

  @ApiProperty({ description: 'Evaluación' })
  @IsString()
  evaluation: string;

  @ApiProperty({ description: 'Plan' })
  @IsString()
  plan: string;
}

@Injectable()
export class ClinicalNotesService {
  constructor(private readonly prisma: PrismaService) {}

  findByPatient(patientId: string) {
    return this.prisma.clinicalNote.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  create(patientId: string, dto: SoepDto, authorId: string) {
    const lockedAt = new Date(Date.now() + LOCK_HOURS * 60 * 60 * 1000);
    return this.prisma.clinicalNote.create({
      data: { ...dto, patientId, authorId, lockedAt },
      include: { author: { select: { id: true, fullName: true } } },
    });
  }

  // RF-05: solo el autor y solo dentro del plazo pueden editar; luego inmutable.
  async update(id: string, dto: SoepDto, user: AuthUser) {
    const note = await this.prisma.clinicalNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Nota no encontrada');
    if (note.authorId !== user.id) {
      throw new ForbiddenException('Solo el autor puede editar la nota');
    }
    if (new Date() > note.lockedAt) {
      throw new ForbiddenException(
        'La nota está bloqueada; use una nota de adenda (RF-05 / RN-01)',
      );
    }
    return this.prisma.clinicalNote.update({
      where: { id },
      data: dto,
      include: { author: { select: { id: true, fullName: true } } },
    });
  }
}

@ApiTags('Notas de evolución SOEP (RF-05)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
class ClinicalNotesController {
  constructor(private readonly service: ClinicalNotesService) {}

  @Get('patients/:patientId/notes')
  @ApiOperation({ summary: 'Listar notas de evolución del paciente' })
  find(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Post('patients/:patientId/notes')
  @Roles(Role.ODONTOLOGO, Role.ADMIN_TI)
  @ApiOperation({ summary: 'Crear nota SOEP firmada' })
  create(
    @Param('patientId') patientId: string,
    @Body() dto: SoepDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(patientId, dto, user.id);
  }

  @Patch('notes/:id')
  @Roles(Role.ODONTOLOGO, Role.ADMIN_TI)
  @ApiOperation({ summary: 'Editar nota (solo autor y dentro del plazo)' })
  update(
    @Param('id') id: string,
    @Body() dto: SoepDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }
}

@Module({
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService],
})
export class ClinicalNotesModule {}
