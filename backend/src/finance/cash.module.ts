import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Module,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CashSessionStatus, PaymentMethod, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

class OpenCashDto {
  @ApiProperty({ example: 50, description: 'Fondo de caja inicial' })
  @IsNumber()
  @Min(0)
  openingAmount: number;
}

class CloseCashDto {
  @ApiProperty({ example: 320.5, description: 'Conteo físico de efectivo' })
  @IsNumber()
  @Min(0)
  countedAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  open(userId: string, openingAmount: number) {
    return this.prisma.cashSession.create({
      data: { openedById: userId, openingAmount },
    });
  }

  // RN-02: NO expone el total teórico mientras la caja está abierta.
  async current(userId: string) {
    const session = await this.prisma.cashSession.findFirst({
      where: { openedById: userId, status: CashSessionStatus.ABIERTA },
      orderBy: { openedAt: 'desc' },
    });
    if (!session) return null;
    return {
      id: session.id,
      openingAmount: session.openingAmount,
      openedAt: session.openedAt,
    };
  }

  async close(id: string, userId: string, dto: CloseCashDto) {
    const session = await this.prisma.cashSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Sesión de caja no encontrada');
    if (session.status === CashSessionStatus.CERRADA) {
      throw new BadRequestException('La caja ya fue cerrada');
    }

    // Total teórico = fondo inicial + pagos en efectivo durante la sesión.
    const payments = await this.prisma.payment.findMany({
      where: {
        method: PaymentMethod.EFECTIVO,
        paidAt: { gte: session.openedAt },
      },
    });
    const cashReceived = payments.reduce((s, p) => s + Number(p.amount), 0);
    const expected = Number(session.openingAmount) + cashReceived;
    const difference = dto.countedAmount - expected;

    // El resultado (esperado/diferencia) se revela solo tras ingresar el conteo.
    return this.prisma.cashSession.update({
      where: { id },
      data: {
        status: CashSessionStatus.CERRADA,
        closedAt: new Date(),
        countedAmount: dto.countedAmount,
        expectedAmount: expected,
        difference,
        notes: dto.notes,
      },
    });
  }
}

@ApiTags('Cierre de caja (RN-02)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cash')
class CashController {
  constructor(private readonly service: CashService) {}

  @Post('open')
  @Roles(Role.ADMIN_TI, Role.RECEPCION)
  @ApiOperation({ summary: 'Abrir caja con fondo inicial' })
  open(@Body() dto: OpenCashDto, @CurrentUser() user: AuthUser) {
    return this.service.open(user.id, dto.openingAmount);
  }

  @Get('current')
  @ApiOperation({ summary: 'Caja abierta del usuario (sin total teórico)' })
  current(@CurrentUser() user: AuthUser) {
    return this.service.current(user.id);
  }

  @Post(':id/close')
  @Roles(Role.ADMIN_TI, Role.RECEPCION)
  @ApiOperation({ summary: 'Cierre ciego: ingresar conteo y ver diferencia' })
  close(
    @Param('id') id: string,
    @Body() dto: CloseCashDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.close(id, user.id, dto);
  }
}

@Module({
  controllers: [CashController],
  providers: [CashService],
})
export class CashModule {}
