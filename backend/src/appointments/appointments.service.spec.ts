import { BadRequestException, ConflictException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

// Pruebas de la regla crítica RN-03 (no solapar citas en el mismo sillón).
describe('AppointmentsService — RN-03', () => {
  const baseDto: CreateAppointmentDto = {
    patientId: 'p1',
    dentistId: 'd1',
    operatoryId: 'o1',
    startsAt: '2026-11-03T14:00:00.000Z',
    endsAt: '2026-11-03T14:30:00.000Z',
  };

  it('rechaza una cita que se solapa en el mismo sillón', async () => {
    const prisma = {
      appointment: {
        findFirst: async () => ({ id: 'existente' }), // ya hay una cita
        create: async () => ({ id: 'nueva' }),
      },
    };
    const service = new AppointmentsService(prisma as any);
    await expect(service.create(baseDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('crea la cita cuando el sillón está libre', async () => {
    const prisma = {
      appointment: {
        findFirst: async () => null, // sin conflicto
        create: async () => ({ id: 'nueva' }),
      },
    };
    const notifications = { scheduleForAppointment: async () => undefined };
    const service = new AppointmentsService(prisma as any, notifications as any);
    await expect(service.create(baseDto)).resolves.toEqual({ id: 'nueva' });
  });

  it('rechaza si la hora de fin no es posterior a la de inicio', async () => {
    const prisma = { appointment: { findFirst: async () => null } };
    const service = new AppointmentsService(prisma as any);
    await expect(
      service.create({
        ...baseDto,
        endsAt: baseDto.startsAt, // mismo instante
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
