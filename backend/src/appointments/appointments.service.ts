import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { NotificationsService } from '../notifications/notifications.module';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // RN-03: no se permiten dos citas simultáneas en el mismo sillón físico,
  // aunque sean odontólogos distintos. Dos intervalos se solapan si
  // start < otroFin && fin > otroStart.
  private async assertNoOperatoryOverlap(
    operatoryId: string,
    startsAt: Date,
    endsAt: Date,
    excludeId?: string,
  ) {
    const clash = await this.prisma.appointment.findFirst({
      where: {
        operatoryId,
        id: excludeId ? { not: excludeId } : undefined,
        status: { notIn: [AppointmentStatus.CANCELADO, AppointmentStatus.NO_ASISTIO] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (clash) {
      throw new ConflictException(
        'El sillón ya tiene una cita en ese horario (RN-03)',
      );
    }
  }

  async create(dto: CreateAppointmentDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la de inicio',
      );
    }
    await this.assertNoOperatoryOverlap(dto.operatoryId, startsAt, endsAt);

    const created = await this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        dentistId: dto.dentistId,
        operatoryId: dto.operatoryId,
        startsAt,
        endsAt,
        reason: dto.reason,
      },
      include: { patient: true, dentist: true, operatory: true },
    });

    // RF-11: programa los recordatorios 48h/24h de esta cita.
    await this.notifications.scheduleForAppointment(created.id);
    return created;
  }

  // RF-09: agenda filtrable por rango, sillón y profesional.
  async findAll(params: {
    from?: string;
    to?: string;
    operatoryId?: string;
    dentistId?: string;
  }) {
    return this.prisma.appointment.findMany({
      where: {
        operatoryId: params.operatoryId,
        dentistId: params.dentistId,
        startsAt: {
          gte: params.from ? new Date(params.from) : undefined,
          lte: params.to ? new Date(params.to) : undefined,
        },
      },
      orderBy: { startsAt: 'asc' },
      include: { patient: true, dentist: true, operatory: true },
    });
  }

  async updateStatus(id: string, status: AppointmentStatus) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Cita no encontrada');
    return this.prisma.appointment.update({
      where: { id },
      data: { status },
      include: { patient: true, dentist: true, operatory: true },
    });
  }
}
