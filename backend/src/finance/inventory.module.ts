import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Module,
  Injectable,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Prisma, Role, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

class CreateSupplyDto {
  @ApiProperty({ example: 'Anestesia lidocaína' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'unidad' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;
}

class MovementDto {
  @ApiProperty({ enum: [StockMovementType.ENTRADA, StockMovementType.AJUSTE] })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({ example: 50, description: 'Cantidad (puede ser negativa en ajuste)' })
  @IsInt()
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

class RecipeItemDto {
  @ApiProperty()
  @IsString()
  supplyId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

class SetRecipeDto {
  @ApiProperty({ type: [RecipeItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items: RecipeItemDto[];
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.supply.findMany({ orderBy: { name: 'asc' } });
  }

  async lowStock() {
    const supplies = await this.prisma.supply.findMany({
      where: { isActive: true },
    });
    return supplies.filter((s) => s.stock <= s.minStock);
  }

  create(dto: CreateSupplyDto) {
    return this.prisma.supply.create({
      data: {
        name: dto.name,
        unit: dto.unit ?? 'unidad',
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
      },
    });
  }

  async movement(id: string, dto: MovementDto) {
    const delta =
      dto.type === StockMovementType.ENTRADA
        ? Math.abs(dto.quantity)
        : dto.quantity;
    await this.prisma.stockMovement.create({
      data: { supplyId: id, type: dto.type, quantity: delta, reason: dto.reason },
    });
    return this.prisma.supply.update({
      where: { id },
      data: { stock: { increment: delta } },
    });
  }

  getRecipe(procedureId: string) {
    return this.prisma.procedureSupply.findMany({
      where: { procedureId },
      include: { supply: true },
    });
  }

  // Reemplaza la receta de consumo del procedimiento (RF-14).
  async setRecipe(procedureId: string, items: RecipeItemDto[]) {
    await this.prisma.procedureSupply.deleteMany({ where: { procedureId } });
    const data: Prisma.ProcedureSupplyCreateManyInput[] = items.map((i) => ({
      procedureId,
      supplyId: i.supplyId,
      quantity: i.quantity,
    }));
    await this.prisma.procedureSupply.createMany({ data });
    return this.getRecipe(procedureId);
  }
}

@ApiTags('Inventario (RF-14)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('supplies')
  @ApiOperation({ summary: 'Listar insumos' })
  findAll() {
    return this.service.findAll();
  }

  @Get('supplies/low-stock')
  @ApiOperation({ summary: 'Insumos en o bajo el mínimo' })
  lowStock() {
    return this.service.lowStock();
  }

  @Post('supplies')
  @Roles(Role.ADMIN_TI)
  @ApiOperation({ summary: 'Crear insumo' })
  create(@Body() dto: CreateSupplyDto) {
    return this.service.create(dto);
  }

  @Post('supplies/:id/movement')
  @Roles(Role.ADMIN_TI, Role.AUDITOR)
  @ApiOperation({ summary: 'Registrar entrada / ajuste de stock' })
  movement(@Param('id') id: string, @Body() dto: MovementDto) {
    return this.service.movement(id, dto);
  }

  @Get('procedures/:procedureId/recipe')
  @ApiOperation({ summary: 'Ver receta de consumo del procedimiento' })
  getRecipe(@Param('procedureId') procedureId: string) {
    return this.service.getRecipe(procedureId);
  }

  @Put('procedures/:procedureId/recipe')
  @Roles(Role.ADMIN_TI)
  @ApiOperation({ summary: 'Definir receta de consumo del procedimiento' })
  setRecipe(
    @Param('procedureId') procedureId: string,
    @Body() dto: SetRecipeDto,
  ) {
    return this.service.setRecipe(procedureId, dto.items);
  }
}

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
