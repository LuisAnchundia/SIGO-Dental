import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Module,
  Injectable,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

class CreateProcedureDto {
  @ApiProperty({ example: 'D2150' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Restauración de amalgama' })
  @IsString()
  name: string;

  @ApiProperty({ example: 80 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  labCost?: number;
}

@Injectable()
export class ProceduresService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.procedure.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateProcedureDto) {
    return this.prisma.procedure.create({
      data: {
        code: dto.code,
        name: dto.name,
        basePrice: dto.basePrice,
        labCost: dto.labCost ?? 0,
      },
    });
  }
}

@ApiTags('Catálogo de procedimientos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('procedures')
class ProceduresController {
  constructor(private readonly service: ProceduresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar procedimientos del catálogo' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(Role.ADMIN_TI)
  @ApiOperation({ summary: 'Agregar procedimiento al catálogo' })
  create(@Body() dto: CreateProcedureDto) {
    return this.service.create(dto);
  }
}

@Module({
  controllers: [ProceduresController],
  providers: [ProceduresService],
})
export class ProceduresModule {}
