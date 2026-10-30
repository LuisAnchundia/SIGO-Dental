import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global para no reimportarlo en cada módulo de dominio.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
