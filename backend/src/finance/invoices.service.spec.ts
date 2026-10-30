import { InvoicesService } from './invoices.module';

// Pruebas del estado de factura según pagos (RF-12).
describe('InvoicesService.addPayment', () => {
  function buildService(total: number, paymentsAfter: number[]) {
    const prisma = {
      invoice: {
        findUnique: async () => ({ id: 'i1', total, items: [], payments: [] }),
        update: async (args: any) => ({ status: args.data.status }),
      },
      payment: {
        create: async () => ({}),
        findMany: async () => paymentsAfter.map((a) => ({ amount: a })),
      },
    };
    return new InvoicesService(prisma as any);
  }

  it('marca PAGADA cuando lo pagado cubre el total', async () => {
    const service = buildService(80, [80]);
    const r: any = await service.addPayment('i1', {
      method: 'EFECTIVO' as any,
      amount: 80,
    });
    expect(r.status).toBe('PAGADA');
  });

  it('marca PARCIAL cuando el pago es menor al total', async () => {
    const service = buildService(80, [50]);
    const r: any = await service.addPayment('i1', {
      method: 'EFECTIVO' as any,
      amount: 50,
    });
    expect(r.status).toBe('PARCIAL');
  });
});

// RF-12: timbrado / autorización fiscal (simulado).
describe('InvoicesService.authorize', () => {
  it('genera una clave de acceso de 49 dígitos', async () => {
    const prisma = {
      invoice: {
        findUnique: async () => ({ id: 'i1', authorizationNumber: null }),
        update: async (args: any) => args.data,
      },
    };
    const service = new InvoicesService(prisma as any);
    const r: any = await service.authorize('i1');
    expect(r.accessKey).toHaveLength(49);
    expect(/^\d{49}$/.test(r.accessKey)).toBe(true);
    expect(r.authorizedAt).toBeInstanceOf(Date);
  });
});
