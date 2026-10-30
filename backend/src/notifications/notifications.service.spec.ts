import { NotificationsService } from './notifications.module';

// RF-11: procesamiento de recordatorios vencidos.
describe('NotificationsService.processDue', () => {
  it('envía las notificaciones pendientes y las marca como ENVIADO', async () => {
    const updates: any[] = [];
    const prisma = {
      notification: {
        findMany: async () => [
          { id: 'n1', channel: 'EMAIL', to: 'a@b.com', message: 'hola' },
          { id: 'n2', channel: 'WHATSAPP', to: '099', message: 'hola' },
        ],
        update: async (args: any) => {
          updates.push(args);
          return args.data;
        },
      },
    };
    const provider = {
      mode: 'simulado',
      send: async () => 'ref_123',
    };
    const service = new NotificationsService(prisma as any, provider as any);
    const r = await service.processDue();
    expect(r.processed).toBe(2);
    expect(r.sent).toBe(2);
    expect(updates.every((u) => u.data.status === 'ENVIADO')).toBe(true);
  });
});
