import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Module,
  Injectable,
  ConflictException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('El correo ya está registrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        passwordHash,
      },
    });
    return this.strip(user);
  }

  async findAll(role?: Role) {
    const users = await this.prisma.user.findMany({
      where: { role, isActive: true },
      orderBy: { fullName: 'asc' },
    });
    return users.map((u) => this.strip(u));
  }

  private strip<T extends { passwordHash?: string }>(user: T) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios (opcional filtrar por rol)' })
  findAll(@Query('role') role?: Role) {
    return this.service.findAll(role);
  }

  @Post()
  @Roles(Role.ADMIN_TI)
  @ApiOperation({ summary: 'Crear usuario del personal (solo Admin TI)' })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
