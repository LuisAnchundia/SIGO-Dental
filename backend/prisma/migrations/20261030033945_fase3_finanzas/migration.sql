-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PORCENTAJE', 'MONTO_FIJO', 'PORCENTAJE_NETO');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('ABIERTA', 'CERRADA');

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "procedureId" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "dentistId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "commissionType" "CommissionType" NOT NULL DEFAULT 'PORCENTAJE',
ADD COLUMN     "commissionValue" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "supplies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unidad',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_supplies" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "procedure_supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "openingAmount" DECIMAL(10,2) NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'ABIERTA',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "countedAmount" DECIMAL(10,2),
    "expectedAmount" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "notes" TEXT,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplies_name_key" ON "supplies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_supplies_procedureId_supplyId_key" ON "procedure_supplies"("procedureId", "supplyId");

-- CreateIndex
CREATE INDEX "stock_movements_supplyId_createdAt_idx" ON "stock_movements"("supplyId", "createdAt");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_supplies" ADD CONSTRAINT "procedure_supplies_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_supplies" ADD CONSTRAINT "procedure_supplies_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "supplies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "supplies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
