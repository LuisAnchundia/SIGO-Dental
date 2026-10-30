import { PrismaClient, Role, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const pass = await bcrypt.hash('Admin123*', 10);

  // Personal (RNF-05 RBAC)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sigodental.com' },
    update: {},
    create: {
      email: 'admin@sigodental.com',
      fullName: 'Administrador del Sistema',
      role: Role.ADMIN_TI,
      passwordHash: pass,
    },
  });

  const dentist = await prisma.user.upsert({
    where: { email: 'odontologo@sigodental.com' },
    update: {},
    create: {
      email: 'odontologo@sigodental.com',
      fullName: 'Dra. Carolina Mera',
      role: Role.ODONTOLOGO,
      passwordHash: pass,
    },
  });

  await prisma.user.upsert({
    where: { email: 'recepcion@sigodental.com' },
    update: {},
    create: {
      email: 'recepcion@sigodental.com',
      fullName: 'Recepción Clínica',
      role: Role.RECEPCION,
      passwordHash: pass,
    },
  });

  // Sillones (RN-03)
  const op1 = await prisma.operatory.upsert({
    where: { name: 'Sillón 1' },
    update: {},
    create: { name: 'Sillón 1' },
  });
  await prisma.operatory.upsert({
    where: { name: 'Sillón 2' },
    update: {},
    create: { name: 'Sillón 2' },
  });

  // Catálogo de procedimientos
  const procedures = [
    { code: 'D0120', name: 'Consulta / evaluación', basePrice: 25 },
    { code: 'D1110', name: 'Profilaxis (limpieza)', basePrice: 40 },
    { code: 'D2150', name: 'Restauración de amalgama', basePrice: 80 },
    { code: 'D2740', name: 'Corona de porcelana', basePrice: 350, labCost: 120 },
    { code: 'D7140', name: 'Extracción simple', basePrice: 60 },
  ];
  for (const p of procedures) {
    await prisma.procedure.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }

  // Comisión del odontólogo (RF-13): 40% sobre honorarios.
  await prisma.user.update({
    where: { id: dentist.id },
    data: { commissionType: 'PORCENTAJE', commissionValue: 40 },
  });

  // Insumos de inventario (RF-14)
  const supplies = [
    { name: 'Anestesia lidocaína', unit: 'cartucho', stock: 100, minStock: 20 },
    { name: 'Guantes', unit: 'par', stock: 200, minStock: 40 },
    { name: 'Resina compuesta', unit: 'jeringa', stock: 30, minStock: 10 },
    { name: 'Agujas dentales', unit: 'unidad', stock: 150, minStock: 30 },
  ];
  for (const s of supplies) {
    await prisma.supply.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
  }

  // Recetas de consumo: qué insumos descarga cada procedimiento (RF-14)
  const anest = await prisma.supply.findUnique({
    where: { name: 'Anestesia lidocaína' },
  });
  const guantes = await prisma.supply.findUnique({ where: { name: 'Guantes' } });
  const resina = await prisma.supply.findUnique({
    where: { name: 'Resina compuesta' },
  });
  const aguja = await prisma.supply.findUnique({
    where: { name: 'Agujas dentales' },
  });
  const restauracion = await prisma.procedure.findUnique({
    where: { code: 'D2150' },
  });
  const extraccion = await prisma.procedure.findUnique({
    where: { code: 'D7140' },
  });

  const recipes = [
    { procedureId: restauracion!.id, supplyId: anest!.id, quantity: 1 },
    { procedureId: restauracion!.id, supplyId: guantes!.id, quantity: 1 },
    { procedureId: restauracion!.id, supplyId: resina!.id, quantity: 1 },
    { procedureId: extraccion!.id, supplyId: anest!.id, quantity: 2 },
    { procedureId: extraccion!.id, supplyId: guantes!.id, quantity: 1 },
    { procedureId: extraccion!.id, supplyId: aguja!.id, quantity: 1 },
  ];
  for (const r of recipes) {
    await prisma.procedureSupply.upsert({
      where: {
        procedureId_supplyId: {
          procedureId: r.procedureId,
          supplyId: r.supplyId,
        },
      },
      update: {},
      create: r,
    });
  }

  // Pacientes de ejemplo, uno con alerta médica crítica (RF-02)
  await prisma.patient.upsert({
    where: { documentId: '1312345678' },
    update: {},
    create: {
      documentId: '1312345678',
      firstName: 'María',
      lastName: 'González',
      birthDate: new Date('1992-03-14'),
      gender: Gender.FEMENINO,
      phone: '0991112223',
      email: 'maria.gonzalez@example.com',
      medicalHistory: {
        create: {
          allergies: 'Penicilina',
          penicillinAllergy: true,
          isAnticoagulated: false,
          criticalAlerts: ['ALERGIA A PENICILINA', 'ALERGIAS: Penicilina'],
        },
      },
    },
  });

  await prisma.patient.upsert({
    where: { documentId: '1309876543' },
    update: {},
    create: {
      documentId: '1309876543',
      firstName: 'Jorge',
      lastName: 'Vera',
      birthDate: new Date('1985-11-02'),
      gender: Gender.MASCULINO,
      phone: '0984445556',
    },
  });

  console.log('Seed completado.');
  console.log('Usuarios (contraseña: Admin123*):');
  console.log('  admin@sigodental.com      (ADMIN_TI)');
  console.log('  odontologo@sigodental.com (ODONTOLOGO)');
  console.log('  recepcion@sigodental.com  (RECEPCION)');
  void admin;
  void dentist;
  void op1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
