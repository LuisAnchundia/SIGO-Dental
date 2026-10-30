import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditInterceptor } from './common/audit.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { OperatoriesModule } from './operatories/operatories.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ProceduresModule } from './procedures/procedures.module';
import { OdontogramModule } from './clinical/odontogram.module';
import { PeriodontogramModule } from './clinical/periodontogram.module';
import { ClinicalNotesModule } from './clinical/clinical-notes.module';
import { ConsentsModule } from './clinical/consents.module';
import { InvoicesModule } from './finance/invoices.module';
import { InventoryModule } from './finance/inventory.module';
import { CashModule } from './finance/cash.module';
import { TreatmentPlansModule } from './finance/treatment-plans.module';
import { ReportsModule } from './finance/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting (OWASP): 200 solicitudes por minuto por IP.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    OperatoriesModule,
    AppointmentsModule,
    ProceduresModule,
    OdontogramModule,
    PeriodontogramModule,
    ClinicalNotesModule,
    ConsentsModule,
    InvoicesModule,
    InventoryModule,
    CashModule,
    TreatmentPlansModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
