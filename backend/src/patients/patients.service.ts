import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto, MedicalHistoryDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  // RF-02: deriva las alertas críticas que alimentan el badge de alta
  // visibilidad en la cabecera del expediente.
  private buildCriticalAlerts(mh?: MedicalHistoryDto): string[] {
    if (!mh) return [];
    const alerts: string[] = [];
    if (mh.penicillinAllergy) alerts.push('ALERGIA A PENICILINA');
    if (mh.isAnticoagulated) alerts.push('PACIENTE ANTICOAGULADO');
    if (mh.coagulopathies) alerts.push('COAGULOPATÍA');
    if (mh.allergies && mh.allergies.trim().length > 0) {
      alerts.push(`ALERGIAS: ${mh.allergies.trim()}`);
    }
    return alerts;
  }

  async create(dto: CreatePatientDto) {
    const exists = await this.prisma.patient.findUnique({
      where: { documentId: dto.documentId },
    });
    if (exists) {
      throw new ConflictException(
        'Ya existe un paciente con esa identificación',
      );
    }

    const { medicalHistory, birthDate, ...rest } = dto;
    return this.prisma.patient.create({
      data: {
        ...rest,
        birthDate: new Date(birthDate),
        medicalHistory: medicalHistory
          ? {
              create: {
                ...medicalHistory,
                criticalAlerts: this.buildCriticalAlerts(medicalHistory),
              },
            }
          : undefined,
      },
      include: { medicalHistory: true },
    });
  }

  async findAll(search?: string) {
    return this.prisma.patient.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { documentId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { lastName: 'asc' },
      include: { medicalHistory: true },
    });
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { medicalHistory: true },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto) {
    await this.findOne(id);
    const { medicalHistory, birthDate, ...rest } = dto;

    return this.prisma.patient.update({
      where: { id },
      data: {
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        medicalHistory: medicalHistory
          ? {
              upsert: {
                create: {
                  ...medicalHistory,
                  criticalAlerts: this.buildCriticalAlerts(medicalHistory),
                },
                update: {
                  ...medicalHistory,
                  criticalAlerts: this.buildCriticalAlerts(medicalHistory),
                },
              },
            }
          : undefined,
      },
      include: { medicalHistory: true },
    });
  }

  // Baja lógica: no se eliminan pacientes físicamente (coherente con RN-01).
  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
