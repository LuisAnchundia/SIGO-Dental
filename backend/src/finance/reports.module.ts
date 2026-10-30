import {
  Controller,
  Get,
  Query,
  UseGuards,
  Module,
  Injectable,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommissionType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

function range(from?: string, to?: string) {
  return {
    gte: from ? new Date(from) : undefined,
    lte: to ? new Date(to) : undefined,
  };
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Corte de caja: pagos por método en el período.
  async cashClose(from?: string, to?: string) {
    const payments = await this.prisma.payment.findMany({
      where: { paidAt: range(from, to) },
    });
    const byMethod: Record<string, number> = {};
    let total = 0;
    for (const p of payments) {
      const amt = Number(p.amount);
      byMethod[p.method] = (byMethod[p.method] ?? 0) + amt;
      total += amt;
    }
    return { total, count: payments.length, byMethod };
  }

  // Liquidación de honorarios por profesional (RF-13).
  async commissions(from?: string, to?: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { issuedAt: range(from, to), dentistId: { not: null } },
      include: { items: { include: { procedure: true } }, dentist: true },
    });

    const map = new Map<
      string,
      {
        dentistId: string;
        dentist: string;
        type: CommissionType;
        value: number;
        base: number;
        labCost: number;
        procedures: number;
        commission: number;
      }
    >();

    for (const inv of invoices) {
      if (!inv.dentist) continue;
      const d = inv.dentist;
      const entry =
        map.get(d.id) ??
        {
          dentistId: d.id,
          dentist: d.fullName,
          type: d.commissionType,
          value: Number(d.commissionValue),
          base: 0,
          labCost: 0,
          procedures: 0,
          commission: 0,
        };
      entry.base += Number(inv.subtotal);
      for (const it of inv.items) {
        if (it.procedure) {
          entry.labCost += Number(it.procedure.labCost) * it.quantity;
          entry.procedures += it.quantity;
        }
      }
      map.set(d.id, entry);
    }

    const result = [...map.values()].map((e) => {
      let commission = 0;
      if (e.type === CommissionType.PORCENTAJE) {
        commission = (e.base * e.value) / 100;
      } else if (e.type === CommissionType.PORCENTAJE_NETO) {
        commission = ((e.base - e.labCost) * e.value) / 100;
      } else {
        commission = e.value * e.procedures; // MONTO_FIJO por procedimiento
      }
      return { ...e, commission: Math.round(commission * 100) / 100 };
    });
    return result;
  }

  // Reporte de inventario con marca de stock bajo.
  async inventory() {
    const supplies = await this.prisma.supply.findMany({
      orderBy: { name: 'asc' },
    });
    return supplies.map((s) => ({ ...s, lowStock: s.stock <= s.minStock }));
  }
}

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('cash-close')
  @Roles(Role.ADMIN_TI, Role.AUDITOR, Role.RECEPCION)
  @ApiOperation({ summary: 'Corte de caja por período' })
  cashClose(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.cashClose(from, to);
  }

  @Get('commissions')
  @Roles(Role.ADMIN_TI, Role.AUDITOR)
  @ApiOperation({ summary: 'Liquidación de honorarios (RF-13)' })
  commissions(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.commissions(from, to);
  }

  @Get('inventory')
  @Roles(Role.ADMIN_TI, Role.AUDITOR)
  @ApiOperation({ summary: 'Reporte de inventario' })
  inventory() {
    return this.service.inventory();
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
