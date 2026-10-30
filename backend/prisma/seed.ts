import { PrismaClient, Role, Gender, AppointmentStatus, TreatmentPlanStatus, ConsentMethod, NotificationChannel, NotificationStatus, CashSessionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function days(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function main() {
  const pass = await bcrypt.hash('Admin123*', 10);

  // -------------------------------------------------------------------
  // PERSONAL (RNF-05 RBAC) — un usuario por cada rol del sistema
  // -------------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sigodental.com' },
    update: {},
    create: { email: 'admin@sigodental.com', fullName: 'Administrador del Sistema', role: Role.ADMIN_TI, passwordHash: pass },
  });

  const dentist = await prisma.user.upsert({
    where: { email: 'odontologo@sigodental.com' },
    update: {},
    create: { email: 'odontologo@sigodental.com', fullName: 'Dra. Carolina Mera', role: Role.ODONTOLOGO, passwordHash: pass, commissionType: 'PORCENTAJE', commissionValue: 40 },
  });

  const dentist2 = await prisma.user.upsert({
    where: { email: 'odontologo2@sigodental.com' },
    update: {},
    create: { email: 'odontologo2@sigodental.com', fullName: 'Dr. Andrés Villacrés', role: Role.ODONTOLOGO, passwordHash: pass, commissionType: 'PORCENTAJE_NETO', commissionValue: 50 },
  });

  const recepcion = await prisma.user.upsert({
    where: { email: 'recepcion@sigodental.com' },
    update: {},
    create: { email: 'recepcion@sigodental.com', fullName: 'Recepción Clínica', role: Role.RECEPCION, passwordHash: pass },
  });

  const asistente = await prisma.user.upsert({
    where: { email: 'asistente@sigodental.com' },
    update: {},
    create: { email: 'asistente@sigodental.com', fullName: 'Pamela Ríos', role: Role.ASISTENTE, passwordHash: pass },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@sigodental.com' },
    update: {},
    create: { email: 'auditor@sigodental.com', fullName: 'Jorge Salcedo', role: Role.AUDITOR, passwordHash: pass },
  });

  // -------------------------------------------------------------------
  // SILLONES (RN-03)
  // -------------------------------------------------------------------
  const op1 = await prisma.operatory.upsert({ where: { name: 'Sillón 1' }, update: {}, create: { name: 'Sillón 1' } });
  const op2 = await prisma.operatory.upsert({ where: { name: 'Sillón 2' }, update: {}, create: { name: 'Sillón 2' } });

  // -------------------------------------------------------------------
  // CATÁLOGO DE PROCEDIMIENTOS
  // -------------------------------------------------------------------
  const procedureData = [
    { code: 'D0120', name: 'Consulta / evaluación', basePrice: 25 },
    { code: 'D1110', name: 'Profilaxis (limpieza)', basePrice: 40 },
    { code: 'D2150', name: 'Restauración de amalgama', basePrice: 80 },
    { code: 'D2740', name: 'Corona de porcelana', basePrice: 350, labCost: 120 },
    { code: 'D7140', name: 'Extracción simple', basePrice: 60 },
    { code: 'D3310', name: 'Endodoncia unirradicular', basePrice: 180, labCost: 20 },
    { code: 'D1351', name: 'Sellante de fosas y fisuras', basePrice: 30 },
  ];
  for (const p of procedureData) {
    await prisma.procedure.upsert({ where: { code: p.code }, update: {}, create: p });
  }
  const procs = Object.fromEntries(
    (await prisma.procedure.findMany()).map((p) => [p.code, p]),
  );

  // -------------------------------------------------------------------
  // INVENTARIO (RF-14) + recetas de consumo
  // -------------------------------------------------------------------
  const supplyData = [
    { name: 'Anestesia lidocaína', unit: 'cartucho', stock: 100, minStock: 20 },
    { name: 'Guantes', unit: 'par', stock: 200, minStock: 40 },
    { name: 'Resina compuesta', unit: 'jeringa', stock: 30, minStock: 10 },
    { name: 'Agujas dentales', unit: 'unidad', stock: 150, minStock: 30 },
    { name: 'Gasas estériles', unit: 'paquete', stock: 8, minStock: 15 }, // bajo stock a propósito
    { name: 'Limas endodónticas', unit: 'unidad', stock: 25, minStock: 10 },
  ];
  for (const s of supplyData) {
    await prisma.supply.upsert({ where: { name: s.name }, update: {}, create: s });
  }
  const supplies = Object.fromEntries(
    (await prisma.supply.findMany()).map((s) => [s.name, s]),
  );

  const recipes = [
    { procedureId: procs['D2150'].id, supplyId: supplies['Anestesia lidocaína'].id, quantity: 1 },
    { procedureId: procs['D2150'].id, supplyId: supplies['Guantes'].id, quantity: 1 },
    { procedureId: procs['D2150'].id, supplyId: supplies['Resina compuesta'].id, quantity: 1 },
    { procedureId: procs['D7140'].id, supplyId: supplies['Anestesia lidocaína'].id, quantity: 2 },
    { procedureId: procs['D7140'].id, supplyId: supplies['Guantes'].id, quantity: 1 },
    { procedureId: procs['D7140'].id, supplyId: supplies['Agujas dentales'].id, quantity: 1 },
    { procedureId: procs['D3310'].id, supplyId: supplies['Limas endodónticas'].id, quantity: 3 },
    { procedureId: procs['D3310'].id, supplyId: supplies['Guantes'].id, quantity: 1 },
  ];
  for (const r of recipes) {
    await prisma.procedureSupply.upsert({
      where: { procedureId_supplyId: { procedureId: r.procedureId, supplyId: r.supplyId } },
      update: {},
      create: r,
    });
  }

  // Movimientos de stock: una entrada reciente (reposición)
  await prisma.stockMovement.createMany({
    data: [
      { supplyId: supplies['Guantes'].id, type: 'ENTRADA', quantity: 100, reason: 'Compra proveedor DentalSupply' },
      { supplyId: supplies['Gasas estériles'].id, type: 'AJUSTE', quantity: -2, reason: 'Conteo físico mensual' },
    ],
  });

  // -------------------------------------------------------------------
  // PACIENTES (RF-01, RF-02) — 6 pacientes con perfiles variados
  // -------------------------------------------------------------------
  const patientData = [
    {
      documentId: '1312345678', firstName: 'María', lastName: 'González',
      birthDate: '1992-03-14', gender: Gender.FEMENINO, phone: '0991112223', email: 'maria.gonzalez@example.com',
      medicalHistory: { allergies: 'Penicilina', penicillinAllergy: true, criticalAlerts: ['ALERGIA A PENICILINA', 'ALERGIAS: Penicilina'] },
    },
    {
      documentId: '1309876543', firstName: 'Jorge', lastName: 'Vera',
      birthDate: '1985-11-02', gender: Gender.MASCULINO, phone: '0984445556', email: 'jorge.vera@example.com',
    },
    {
      documentId: '1315558899', firstName: 'Andrea', lastName: 'Cedeño',
      birthDate: '1998-06-20', gender: Gender.FEMENINO, phone: '0987001122', email: 'andrea.cedeno@example.com',
      medicalHistory: { isAnticoagulated: true, coagulopathies: true, criticalAlerts: ['PACIENTE ANTICOAGULADO', 'COAGULOPATÍA'] },
    },
    {
      documentId: '1322223344', firstName: 'Luis', lastName: 'Pazmiño',
      birthDate: '1975-01-30', gender: Gender.MASCULINO, phone: '0998887766', email: 'luis.pazmino@example.com',
      insuranceProvider: 'Seguros Equinoccial', insuranceNumber: 'SE-44221',
    },
    {
      documentId: '1308765432', firstName: 'Valentina', lastName: 'Macías',
      birthDate: '2016-09-10', gender: Gender.FEMENINO, phone: '0991234567', email: 'tutor.macias@example.com',
      guardianName: 'Patricia Macías', guardianPhone: '0991234567',
    },
    {
      documentId: '1319998877', firstName: 'Ramiro', lastName: 'Chávez',
      birthDate: '1960-04-05', gender: Gender.MASCULINO, phone: '0995556677', email: 'ramiro.chavez@example.com',
      medicalHistory: { systemicDiseases: 'Hipertensión', allergies: 'Ninguna conocida', criticalAlerts: [] },
    },
  ];

  for (const p of patientData) {
    const { medicalHistory, birthDate, ...rest } = p as any;
    await prisma.patient.upsert({
      where: { documentId: p.documentId },
      update: {},
      create: {
        ...rest,
        birthDate: new Date(birthDate),
        medicalHistory: medicalHistory ? { create: medicalHistory } : undefined,
      },
    });
  }
  const patients = Object.fromEntries(
    (await prisma.patient.findMany()).map((p) => [p.documentId, p]),
  );
  const maria = patients['1312345678'];
  const jorge = patients['1309876543'];
  const andrea = patients['1315558899'];
  const luis = patients['1322223344'];
  const valentina = patients['1308765432'];
  const ramiro = patients['1319998877'];

  // -------------------------------------------------------------------
  // AGENDA (RF-09, RF-10) — citas en distintos estados y sillones
  // -------------------------------------------------------------------
  const appointmentData = [
    { patientId: maria.id, dentistId: dentist.id, operatoryId: op1.id, startsAt: days(-10), endsAt: days(-10), status: AppointmentStatus.ATENDIDO, reason: 'Restauración molar' },
    { patientId: jorge.id, dentistId: dentist.id, operatoryId: op1.id, startsAt: days(-3), endsAt: days(-3), status: AppointmentStatus.NO_ASISTIO, reason: 'Control' },
    { patientId: andrea.id, dentistId: dentist2.id, operatoryId: op2.id, startsAt: days(-1), endsAt: days(-1), status: AppointmentStatus.ATENDIDO, reason: 'Endodoncia' },
    { patientId: luis.id, dentistId: dentist.id, operatoryId: op1.id, startsAt: days(1), endsAt: days(1), status: AppointmentStatus.CONFIRMADO, reason: 'Corona de porcelana' },
    { patientId: valentina.id, dentistId: dentist2.id, operatoryId: op2.id, startsAt: days(2), endsAt: days(2), status: AppointmentStatus.PROGRAMADO, reason: 'Sellantes' },
    { patientId: ramiro.id, dentistId: dentist.id, operatoryId: op1.id, startsAt: days(4), endsAt: days(4), status: AppointmentStatus.PROGRAMADO, reason: 'Evaluación general' },
    { patientId: maria.id, dentistId: dentist.id, operatoryId: op2.id, startsAt: days(5), endsAt: days(5), status: AppointmentStatus.CANCELADO, reason: 'Limpieza' },
  ];
  const createdAppts: any[] = [];
  for (const a of appointmentData) {
    const endsAt = new Date(a.endsAt.getTime() + 30 * 60 * 1000);
    const appt = await prisma.appointment.create({ data: { ...a, endsAt } });
    createdAppts.push(appt);
  }

  // Recordatorios (RF-11) para las citas futuras — algunos ya "enviados"
  for (const a of createdAppts.filter((x) => x.startsAt > new Date())) {
    const patient = await prisma.patient.findUnique({ where: { id: a.patientId } });
    if (!patient) continue;
    if (patient.email) {
      await prisma.notification.create({
        data: {
          appointmentId: a.id, channel: NotificationChannel.EMAIL, to: patient.email,
          message: `Recordatorio: cita el ${a.startsAt.toLocaleString('es-EC')}`,
          scheduledFor: new Date(a.startsAt.getTime() - 48 * 60 * 60 * 1000),
          status: NotificationStatus.ENVIADO, sentAt: days(-1), providerRef: 'sim_demo_1',
        },
      });
    }
    if (patient.phone) {
      await prisma.notification.create({
        data: {
          appointmentId: a.id, channel: NotificationChannel.WHATSAPP, to: patient.phone,
          message: `Recordatorio: cita el ${a.startsAt.toLocaleString('es-EC')}`,
          scheduledFor: new Date(a.startsAt.getTime() - 24 * 60 * 60 * 1000),
          status: NotificationStatus.PENDIENTE,
        },
      });
    }
  }

  // -------------------------------------------------------------------
  // ODONTOGRAMA (RF-03) — marcas para 2 pacientes
  // -------------------------------------------------------------------
  const toothRecords = [
    { patientId: maria.id, toothNumber: '16', surface: 'OCLUSAL' as const, condition: 'CARIES' as const },
    { patientId: maria.id, toothNumber: '16', surface: 'VESTIBULAR' as const, condition: 'RESTAURACION' as const },
    { patientId: maria.id, toothNumber: '48', surface: 'GENERAL' as const, condition: 'EXODONCIA' as const },
    { patientId: andrea.id, toothNumber: '21', surface: 'GENERAL' as const, condition: 'ENDODONCIA' as const },
    { patientId: andrea.id, toothNumber: '36', surface: 'OCLUSAL' as const, condition: 'SELLANTE' as const },
    { patientId: luis.id, toothNumber: '26', surface: 'GENERAL' as const, condition: 'CORONA' as const },
  ];
  for (const t of toothRecords) {
    await prisma.toothRecord.upsert({
      where: { patientId_toothNumber_surface: { patientId: t.patientId, toothNumber: t.toothNumber, surface: t.surface } },
      update: {},
      create: { ...t, recordedById: dentist.id },
    });
  }

  // -------------------------------------------------------------------
  // PERIODONTOGRAMA (RF-04) — sondaje para Ramiro (paciente mayor)
  // -------------------------------------------------------------------
  const sites = ['MV', 'V', 'DV', 'MP', 'P', 'DP'] as const;
  for (const tooth of ['16', '21', '36']) {
    for (const site of sites) {
      await prisma.perioMeasurement.upsert({
        where: { patientId_toothNumber_site: { patientId: ramiro.id, toothNumber: tooth, site } },
        update: {},
        create: {
          patientId: ramiro.id, toothNumber: tooth, site,
          probingDepth: 2 + Math.floor(Math.random() * 3),
          gingivalMargin: Math.random() > 0.7 ? -1 : 0,
          bleeding: Math.random() > 0.6,
        },
      });
    }
    await prisma.perioTooth.upsert({
      where: { patientId_toothNumber: { patientId: ramiro.id, toothNumber: tooth } },
      update: {},
      create: { patientId: ramiro.id, toothNumber: tooth, mobility: Math.floor(Math.random() * 2), furcation: 0 },
    });
  }

  // -------------------------------------------------------------------
  // NOTAS SOEP (RF-05) — una bloqueada (antigua) y una reciente editable
  // -------------------------------------------------------------------
  await prisma.clinicalNote.create({
    data: {
      patientId: maria.id, authorId: dentist.id,
      subjective: 'Paciente refiere sensibilidad al frío en pieza 16.',
      objective: 'Caries oclusal visible, sin dolor espontáneo.',
      evaluation: 'Caries dentinaria superficial.',
      plan: 'Restauración con resina compuesta.',
      signedAt: days(-10), lockedAt: days(-9), createdAt: days(-10),
    },
  });
  await prisma.clinicalNote.create({
    data: {
      patientId: andrea.id, authorId: dentist2.id,
      subjective: 'Dolor intenso espontáneo en pieza 21.',
      objective: 'Pulpitis irreversible confirmada con pruebas térmicas.',
      evaluation: 'Requiere tratamiento de conductos.',
      plan: 'Endodoncia en pieza 21, control en 1 semana.',
      signedAt: days(-1), lockedAt: days(1), createdAt: days(-1),
    },
  });

  // -------------------------------------------------------------------
  // CONSENTIMIENTOS (RF-06)
  // -------------------------------------------------------------------
  await prisma.consent.create({
    data: {
      patientId: andrea.id, title: 'Consentimiento para endodoncia',
      body: 'Autorizo el tratamiento de conducto en la pieza 21, entendiendo los riesgos y alternativas explicadas.',
      method: ConsentMethod.FIRMA_BIOMETRICA, patientSignerName: 'Andrea Cedeño',
      signedAt: days(-1), createdById: dentist2.id, createdAt: days(-1),
    },
  });
  await prisma.consent.create({
    data: {
      patientId: luis.id, title: 'Consentimiento para corona de porcelana',
      body: 'Autorizo la colocación de corona de porcelana en pieza 26.',
      method: ConsentMethod.OTP, createdById: recepcion.id, createdAt: days(-2),
    },
  });

  // -------------------------------------------------------------------
  // PRESUPUESTOS (RF-07, RF-08)
  // -------------------------------------------------------------------
  const plan1 = await prisma.treatmentPlan.create({
    data: {
      patientId: luis.id, dentistId: dentist.id, status: TreatmentPlanStatus.APROBADO_PARCIAL,
      notes: 'Plan integral de rehabilitación',
      items: {
        create: [
          { procedureId: procs['D2740'].id, phase: 1, toothNumber: '26', fee: 350, labCost: 120, isApproved: true },
          { procedureId: procs['D1110'].id, phase: 1, fee: 40, isApproved: true },
          { procedureId: procs['D3310'].id, phase: 2, toothNumber: '27', fee: 180, labCost: 20, discount: 20, isApproved: false },
        ],
      },
    },
  });
  await prisma.treatmentPlan.create({
    data: {
      patientId: valentina.id, dentistId: dentist2.id, status: TreatmentPlanStatus.PRESENTADO,
      notes: 'Prevención — control pediátrico',
      items: { create: [{ procedureId: procs['D1351'].id, phase: 1, fee: 30, isApproved: false }] },
    },
  });
  void plan1;

  // -------------------------------------------------------------------
  // FACTURACIÓN (RF-12) — distintos estados: pagada, parcial y timbrada
  // -------------------------------------------------------------------
  async function makeInvoice(opts: {
    number: string; patientId: string; dentistId: string;
    items: { procedureId: string; description: string; unitPrice: number }[];
    paid?: number; authorize?: boolean; issuedAt?: Date;
  }) {
    const items = opts.items.map((i) => ({ ...i, quantity: 1, lineTotal: i.unitPrice }));
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const inv = await prisma.invoice.create({
      data: {
        number: opts.number, patientId: opts.patientId, dentistId: opts.dentistId,
        subtotal, tax: 0, total: subtotal, issuedAt: opts.issuedAt ?? new Date(),
        items: { create: items },
      },
    });
    if (opts.paid) {
      await prisma.payment.create({ data: { invoiceId: inv.id, method: 'EFECTIVO', amount: opts.paid, paidAt: opts.issuedAt ?? new Date() } });
    }
    const status = !opts.paid ? 'EMITIDA' : opts.paid >= subtotal ? 'PAGADA' : 'PARCIAL';
    const accessKey = opts.authorize
      ? Array.from({ length: 49 }, () => Math.floor(Math.random() * 10)).join('')
      : undefined;
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        status,
        ...(accessKey ? { accessKey, authorizationNumber: accessKey, authorizedAt: new Date() } : {}),
      },
    });
    return inv;
  }

  await makeInvoice({
    number: 'F-00001', patientId: maria.id, dentistId: dentist.id,
    items: [{ procedureId: procs['D2150'].id, description: 'Restauración de amalgama', unitPrice: 80 }],
    paid: 80, authorize: true, issuedAt: days(-10),
  });
  await makeInvoice({
    number: 'F-00002', patientId: andrea.id, dentistId: dentist2.id,
    items: [{ procedureId: procs['D3310'].id, description: 'Endodoncia unirradicular', unitPrice: 180 }],
    paid: 100, authorize: false, issuedAt: days(-1),
  });
  await makeInvoice({
    number: 'F-00003', patientId: luis.id, dentistId: dentist.id,
    items: [
      { procedureId: procs['D2740'].id, description: 'Corona de porcelana', unitPrice: 350 },
      { procedureId: procs['D1110'].id, description: 'Profilaxis (limpieza)', unitPrice: 40 },
    ],
    paid: 0, authorize: false, issuedAt: days(-2),
  });

  // -------------------------------------------------------------------
  // CAJA (RN-02) — una sesión cerrada de ejemplo (con cuadre exacto)
  // -------------------------------------------------------------------
  await prisma.cashSession.create({
    data: {
      openedById: recepcion.id, openingAmount: 50, status: CashSessionStatus.CERRADA,
      openedAt: days(-1), closedAt: days(-1),
      countedAmount: 150, expectedAmount: 150, difference: 0, notes: 'Cuadre exacto',
    },
  });

  console.log('Seed completado.');
  console.log('Usuarios (contraseña: Admin123*):');
  console.log('  admin@sigodental.com       (ADMIN_TI)');
  console.log('  odontologo@sigodental.com  (ODONTOLOGO — Dra. Mera)');
  console.log('  odontologo2@sigodental.com (ODONTOLOGO — Dr. Villacrés)');
  console.log('  recepcion@sigodental.com   (RECEPCION)');
  console.log('  asistente@sigodental.com   (ASISTENTE)');
  console.log('  auditor@sigodental.com     (AUDITOR)');
  void admin; void asistente; void auditor;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
