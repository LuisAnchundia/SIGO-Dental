import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Module,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(patientId: string) {
    return this.prisma.attachment.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { fullName: true } } },
    });
  }

  create(
    patientId: string,
    file: Express.Multer.File,
    category: string,
    userId?: string,
  ) {
    return this.prisma.attachment.create({
      data: {
        patientId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category: category || 'GENERAL',
        uploadedById: userId,
      },
    });
  }

  async get(id: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('Archivo no encontrado');
    return att;
  }

  async remove(id: string) {
    const att = await this.get(id);
    const path = join(UPLOAD_DIR, att.filename);
    if (existsSync(path)) unlinkSync(path);
    return this.prisma.attachment.delete({ where: { id } });
  }
}

@ApiTags('Archivos del expediente')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Get('patients/:patientId/attachments')
  @ApiOperation({ summary: 'Listar archivos del paciente' })
  list(@Param('patientId') patientId: string) {
    return this.service.list(patientId);
  }

  @Post('patients/:patientId/attachments')
  @Roles(Role.ADMIN_TI, Role.ODONTOLOGO, Role.ASISTENTE, Role.RECEPCION)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir archivo (Rx, foto, PDF)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
    }),
  )
  upload(
    @Param('patientId') patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    return this.service.create(patientId, file, category, user.id);
  }

  @Get('attachments/:id/download')
  @ApiOperation({ summary: 'Descargar archivo' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const att = await this.service.get(id);
    res.set({
      'Content-Type': att.mimeType,
      'Content-Disposition': `inline; filename="${att.originalName}"`,
    });
    createReadStream(join(UPLOAD_DIR, att.filename)).pipe(res);
  }

  @Delete('attachments/:id')
  @Roles(Role.ADMIN_TI, Role.ODONTOLOGO)
  @ApiOperation({ summary: 'Eliminar archivo' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
