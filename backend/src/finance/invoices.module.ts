import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Module,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  InvoiceStatus,
  PaymentMethod,
  Role,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

class InvoiceItemDto {
  @ApiPropertyOptional({ description: 'Procedimiento del catálogo (descarga insumos)' })
  @IsOptional()
  @IsString()
  procedureId?: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 80 })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  patientId: string;

  @ApiPropertyOptional({ description: 'Odontólogo tratante (para honorarios)' })
  @IsOptional()
  @IsString()
  dentistId?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiPropertyOptional({ example: 0, description: 'Impuesto (IVA)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;
}

class AddPaymentDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextNumber(): Promise<string> {
    const count = await this.prisma.invoice.count();
    return `F-${String(count + 1).padStart(5, '0')}`;
  }

  async create(dto: CreateInvoiceDto) {
    const items = dto.items.map((i) => ({
      procedureId: i.procedureId,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.quantity * i.unitPrice,
    }));
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const tax = dto.tax ?? 0;
    const number = await this.nextNumber();

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          number,
          patientId: dto.patientId,
          dentistId: dto.dentistId,
          subtotal,
          tax,
          total: subtotal + tax,
          items: { create: items },
        },
        include: { items: true, payments: true },
      });

      // RF-14: descargo automático de insumos según la receta del procedimiento.
      for (const item of dto.items) {
        if (!item.procedureId) continue;
        const recipe = await tx.procedureSupply.findMany({
          where: { procedureId: item.procedureId },
        });
        for (const r of recipe) {
          const qty = r.quantity * item.quantity;
          await tx.supply.update({
            where: { id: r.supplyId },
            data: { stock: { decrement: qty } },
          });
          await tx.stockMovement.create({
            data: {
              supplyId: r.supplyId,
              type: StockMovementType.SALIDA,
              quantity: -qty,
              reason: `Consumo factura ${number}`,
            },
          });
        }
      }
      return invoice;
    });
  }

  async findAll(from?: string, to?: string) {
    return this.prisma.invoice.findMany({
      where: {
        issuedAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      orderBy: { issuedAt: 'desc' },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        payments: true,
      },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true, payments: true, patient: true, dentist: true },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  // RF-12: autorización/timbrado fiscal. Simulado (genera clave de acceso y
  // número de autorización); listo para conectar el servicio real del SRI.
  async authorize(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.authorizationNumber) return invoice;
    const accessKey = Array.from({ length: 49 }, () =>
      Math.floor(Math.random() * 10),
    ).join('');
    return this.prisma.invoice.update({
      where: { id },
      data: {
        accessKey,
        authorizationNumber: accessKey, // en SRI coinciden en modo offline
        authorizedAt: new Date(),
      },
      include: { items: true, payments: true },
    });
  }

  async addPayment(id: string, dto: AddPaymentDto) {
    const invoice = await this.findOne(id);
    // Pasarela de pago simulada: los pagos con tarjeta reciben una referencia
    // de transacción (listo para Stripe/dLocal reales).
    const isCard =
      dto.method === 'TARJETA_CREDITO' || dto.method === 'TARJETA_DEBITO';
    const transactionRef = isCard
      ? `txn_sim_${Date.now()}`
      : undefined;
    await this.prisma.payment.create({
      data: {
        invoiceId: id,
        method: dto.method,
        amount: dto.amount,
        transactionRef,
      },
    });
    const payments = await this.prisma.payment.findMany({
      where: { invoiceId: id },
    });
    const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const total = Number(invoice.total);
    const status =
      paid >= total ? InvoiceStatus.PAGADA : InvoiceStatus.PARCIAL;
    return this.prisma.invoice.update({
      where: { id },
      data: { status },
      include: { items: true, payments: true },
    });
  }
}

@ApiTags('Facturación / POS (RF-12)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Post()
  @Roles(Role.ADMIN_TI, Role.RECEPCION)
  @ApiOperation({ summary: 'Emitir factura (descarga insumos, RF-14)' })
  create(@Body() dto: CreateInvoiceDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar facturas por rango de fecha' })
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findAll(from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver factura' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/payments')
  @Roles(Role.ADMIN_TI, Role.RECEPCION)
  @ApiOperation({ summary: 'Registrar pago (pagos mixtos)' })
  addPayment(@Param('id') id: string, @Body() dto: AddPaymentDto) {
    return this.service.addPayment(id, dto);
  }

  @Post(':id/authorize')
  @Roles(Role.ADMIN_TI, Role.RECEPCION)
  @ApiOperation({ summary: 'Timbrar / autorizar factura (RF-12, simulado SRI)' })
  authorize(@Param('id') id: string) {
    return this.service.authorize(id);
  }
}

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
