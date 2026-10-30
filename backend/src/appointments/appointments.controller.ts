import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Agenda / Citas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  @Roles(Role.ADMIN_TI, Role.RECEPCION, Role.ODONTOLOGO)
  @ApiOperation({ summary: 'Agendar cita (RF-09, valida RN-03)' })
  create(@Body() dto: CreateAppointmentDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Agenda filtrable por fecha / sillón / profesional' })
  findAll(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('operatoryId') operatoryId?: string,
    @Query('dentistId') dentistId?: string,
  ) {
    return this.service.findAll({ from, to, operatoryId, dentistId });
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN_TI, Role.RECEPCION, Role.ODONTOLOGO, Role.ASISTENTE)
  @ApiOperation({ summary: 'Cambiar estado de la cita (RF-10)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }
}
