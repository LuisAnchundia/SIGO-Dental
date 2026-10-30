import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Module, Injectable } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

class CreateOperatoryDto {
  @ApiProperty({ example: 'Sillón 1' })
  @IsString()
  name: string;
}

@Injectable()
export class OperatoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.operatory.findMany({ orderBy: { name: 'asc' } });
  }

  create(name: string) {
    return this.prisma.operatory.create({ data: { name } });
  }
}

@ApiTags('Sillones / Consultorios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('operatories')
class OperatoriesController {
  constructor(private readonly service: OperatoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sillones' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(Role.ADMIN_TI)
  @ApiOperation({ summary: 'Crear sillón' })
  create(@Body() dto: CreateOperatoryDto) {
    return this.service.create(dto.name);
  }
}

@Module({
  controllers: [OperatoriesController],
  providers: [OperatoriesService],
})
export class OperatoriesModule {}
