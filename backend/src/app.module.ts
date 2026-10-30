import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
  providers: [AppService],
})
export class AppModule {}
