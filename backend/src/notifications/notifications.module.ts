import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Module,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression, ScheduleModule } from '@nestjs/schedule';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// Proveedor de mensajería. Simulado por defecto; listo para claves reales
// (Twilio para SMS/WhatsApp, Resend/SMTP para email) vía variables de entorno.
@Injectable()
class MessagingProvider {
  private readonly logger = new Logger('MessagingProvider');

  get mode() {
    if (process.env.TWILIO_ACCOUNT_SID || process.env.RESEND_API_KEY) {
      return 'real';
    }
    return 'simulado';
  }

  async send(
    channel: NotificationChannel,
    to: string,
    message: string,
  ): Promise<string> {
    // --- Punto de integración real ---
    // if (channel !== 'EMAIL' && process.env.TWILIO_ACCOUNT_SID) {
    //   const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    //   const r = await client.messages.create({ to, from, body: message });
    //   return r.sid;
    // }
    // if (channel === 'EMAIL' && process.env.RESEND_API_KEY) { ... }
    this.logger.log(`[${this.mode}] ${channel} -> ${to}: ${message}`);
    return `sim_${Date.now()}`;
  }
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: MessagingProvider,
  ) {}

  // RF-11: programa recordatorios 48h y 24h antes de la cita, por los canales
  // disponibles según el contacto del paciente.
  async scheduleForAppointment(appointmentId: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, dentist: true, operatory: true },
    });
    if (!appt) return;

    const when = appt.startsAt.toLocaleString('es-EC');
    const message = `Recordatorio SIGO-Dental: ${appt.patient.firstName}, tiene cita el ${when} con ${appt.dentist.fullName} (${appt.operatory.name}).`;

    const channels: { channel: NotificationChannel; to: string }[] = [];
    if (appt.patient.email)
      channels.push({ channel: 'EMAIL', to: appt.patient.email });
    if (appt.patient.phone)
      channels.push({ channel: 'WHATSAPP', to: appt.patient.phone });

    const offsets = [48, 24]; // horas antes
    const data = channels.flatMap((c) =>
      offsets.map((h) => ({
        appointmentId: appt.id,
        channel: c.channel,
        to: c.to,
        message,
        scheduledFor: new Date(appt.startsAt.getTime() - h * 60 * 60 * 1000),
      })),
    );
    if (data.length) await this.prisma.notification.createMany({ data });
  }

  // Procesa las notificaciones vencidas y las "envía".
  async processDue() {
    const due = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDIENTE,
        scheduledFor: { lte: new Date() },
      },
      take: 50,
    });
    let sent = 0;
    for (const n of due) {
      try {
        const ref = await this.provider.send(n.channel, n.to, n.message);
        await this.prisma.notification.update({
          where: { id: n.id },
          data: {
            status: NotificationStatus.ENVIADO,
            sentAt: new Date(),
            providerRef: ref,
          },
        });
        sent++;
      } catch {
        await this.prisma.notification.update({
          where: { id: n.id },
          data: { status: NotificationStatus.FALLIDO },
        });
      }
    }
    return { processed: due.length, sent, mode: this.provider.mode };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  handleCron() {
    void this.processDue();
  }

  list(status?: NotificationStatus) {
    return this.prisma.notification.findMany({
      where: { status },
      orderBy: { scheduledFor: 'desc' },
      take: 100,
    });
  }
}

@ApiTags('Notificaciones (RF-11)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar recordatorios programados/enviados' })
  list(@Query('status') status?: NotificationStatus) {
    return this.service.list(status);
  }

  @Post('process')
  @Roles(Role.ADMIN_TI, Role.RECEPCION)
  @ApiOperation({ summary: 'Procesar ahora los recordatorios vencidos' })
  process() {
    return this.service.processDue();
  }
}

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [NotificationsService, MessagingProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
