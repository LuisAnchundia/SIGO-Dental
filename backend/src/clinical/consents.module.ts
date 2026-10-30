import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Module,
  Injectable,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ConsentMethod, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

class CreateConsentDto {
  @ApiProperty({ example: 'Consentimiento para extracción dental' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Texto legal del consentimiento' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ enum: ConsentMethod })
  @IsOptional()
  @IsEnum(ConsentMethod)
  method?: ConsentMethod;

  @ApiPropertyOptional({ description: 'Firma del paciente (imagen data URL)' })
  @IsOptional()
  @IsString()
  signatureDataUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientSignerName?: string;
}

@Injectable()
export class ConsentsService {
  constructor(private readonly prisma: PrismaService) {}

  findByPatient(patientId: string) {
    return this.prisma.consent.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
  }

  create(patientId: string, dto: CreateConsentDto, userId: string) {
    return this.prisma.consent.create({
      data: {
        patientId,
        title: dto.title,
        body: dto.body,
        method: dto.method ?? ConsentMethod.FIRMA_BIOMETRICA,
        signatureDataUrl: dto.signatureDataUrl,
        patientSignerName: dto.patientSignerName,
        // Se considera firmado si llega la imagen de firma.
        signedAt: dto.signatureDataUrl ? new Date() : null,
        createdById: userId,
      },
    });
  }
}

@ApiTags('Consentimientos informados (RF-06)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients/:patientId/consents')
class ConsentsController {
  constructor(private readonly service: ConsentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar consentimientos del paciente' })
  find(@Param('patientId') patientId: string) {
    return this.service.findByPatient(patientId);
  }

  @Post()
  @Roles(Role.ODONTOLOGO, Role.ADMIN_TI, Role.RECEPCION)
  @ApiOperation({ summary: 'Registrar consentimiento firmado' })
  create(
    @Param('patientId') patientId: string,
    @Body() dto: CreateConsentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(patientId, dto, user.id);
  }
}

@Module({
  controllers: [ConsentsController],
  providers: [ConsentsService],
})
export class ConsentsModule {}
