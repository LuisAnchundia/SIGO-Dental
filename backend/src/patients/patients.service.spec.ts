import { PatientsService } from './patients.service';

// Prueba del cálculo de alertas médicas críticas para el badge (RF-02).
describe('PatientsService — alertas RF-02', () => {
  it('deriva las alertas críticas desde la anamnesis', async () => {
    let captured: any;
    const prisma = {
      patient: {
        findUnique: async () => null,
        create: async (args: any) => {
          captured = args;
          return args;
        },
      },
    };
    const service = new PatientsService(prisma as any);
    await service.create({
      documentId: '1',
      firstName: 'Ana',
      lastName: 'Pérez',
      birthDate: '1990-01-01',
      gender: 'FEMENINO' as any,
      medicalHistory: {
        penicillinAllergy: true,
        isAnticoagulated: true,
        allergies: 'Ibuprofeno',
      },
    });
    const alerts = captured.data.medicalHistory.create.criticalAlerts;
    expect(alerts).toContain('ALERGIA A PENICILINA');
    expect(alerts).toContain('PACIENTE ANTICOAGULADO');
    expect(alerts.some((a: string) => a.includes('Ibuprofeno'))).toBe(true);
  });

  it('sin anamnesis no genera alertas', async () => {
    let captured: any;
    const prisma = {
      patient: {
        findUnique: async () => null,
        create: async (args: any) => {
          captured = args;
          return args;
        },
      },
    };
    const service = new PatientsService(prisma as any);
    await service.create({
      documentId: '2',
      firstName: 'Luis',
      lastName: 'Gómez',
      birthDate: '1985-01-01',
      gender: 'MASCULINO' as any,
    });
    expect(captured.data.medicalHistory).toBeUndefined();
  });
});
