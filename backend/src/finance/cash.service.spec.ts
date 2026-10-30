import { BadRequestException } from '@nestjs/common';
import { CashService } from './cash.module';

// Pruebas del cierre de caja ciego (RN-02).
describe('CashService — RN-02', () => {
  it('calcula esperado (fondo + efectivo) y diferencia', async () => {
    const prisma = {
      cashSession: {
        findUnique: async () => ({
          id: 'c1',
          status: 'ABIERTA',
          openingAmount: 50,
          openedAt: new Date('2020-01-01'),
        }),
        update: async (args: any) => args.data,
      },
      payment: {
        findMany: async () => [{ amount: 80 }, { amount: 20 }],
      },
    };
    const service = new CashService(prisma as any);
    const r: any = await service.close('c1', 'u1', { countedAmount: 150 });
    expect(r.expectedAmount).toBe(150); // 50 + 80 + 20
    expect(r.difference).toBe(0);
  });

  it('reporta faltante/sobrante en la diferencia', async () => {
    const prisma = {
      cashSession: {
        findUnique: async () => ({
          id: 'c1',
          status: 'ABIERTA',
          openingAmount: 100,
          openedAt: new Date('2020-01-01'),
        }),
        update: async (args: any) => args.data,
      },
      payment: { findMany: async () => [{ amount: 50 }] },
    };
    const service = new CashService(prisma as any);
    const r: any = await service.close('c1', 'u1', { countedAmount: 140 });
    expect(r.expectedAmount).toBe(150);
    expect(r.difference).toBe(-10); // faltante
  });

  it('no permite cerrar una caja ya cerrada', async () => {
    const prisma = {
      cashSession: { findUnique: async () => ({ id: 'c1', status: 'CERRADA' }) },
    };
    const service = new CashService(prisma as any);
    await expect(
      service.close('c1', 'u1', { countedAmount: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
