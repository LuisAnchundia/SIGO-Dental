-- CreateEnum
CREATE TYPE "Dentition" AS ENUM ('PERMANENTE', 'TEMPORAL');

-- CreateEnum
CREATE TYPE "ToothSurface" AS ENUM ('MESIAL', 'DISTAL', 'OCLUSAL', 'VESTIBULAR', 'LINGUAL', 'GENERAL');

-- CreateEnum
CREATE TYPE "ToothCondition" AS ENUM ('SANO', 'CARIES', 'RESTAURACION', 'ENDODONCIA', 'IMPLANTE', 'PROTESIS_FIJA', 'PROTESIS_REMOVIBLE', 'EXODONCIA', 'SELLANTE', 'CORONA');

-- CreateEnum
CREATE TYPE "PerioSite" AS ENUM ('MV', 'V', 'DV', 'MP', 'P', 'DP');

-- CreateEnum
CREATE TYPE "ConsentMethod" AS ENUM ('FIRMA_BIOMETRICA', 'OTP');

-- CreateTable
CREATE TABLE "tooth_records" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dentition" "Dentition" NOT NULL DEFAULT 'PERMANENTE',
    "toothNumber" TEXT NOT NULL,
    "surface" "ToothSurface" NOT NULL,
    "condition" "ToothCondition" NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tooth_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perio_measurements" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "toothNumber" TEXT NOT NULL,
    "site" "PerioSite" NOT NULL,
    "probingDepth" INTEGER NOT NULL DEFAULT 0,
    "gingivalMargin" INTEGER NOT NULL DEFAULT 0,
    "bleeding" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perio_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perio_teeth" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "toothNumber" TEXT NOT NULL,
    "mobility" INTEGER NOT NULL DEFAULT 0,
    "furcation" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perio_teeth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjective" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "evaluation" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "method" "ConsentMethod" NOT NULL DEFAULT 'FIRMA_BIOMETRICA',
    "signatureDataUrl" TEXT,
    "patientSignerName" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tooth_records_patientId_toothNumber_surface_key" ON "tooth_records"("patientId", "toothNumber", "surface");

-- CreateIndex
CREATE UNIQUE INDEX "perio_measurements_patientId_toothNumber_site_key" ON "perio_measurements"("patientId", "toothNumber", "site");

-- CreateIndex
CREATE UNIQUE INDEX "perio_teeth_patientId_toothNumber_key" ON "perio_teeth"("patientId", "toothNumber");

-- CreateIndex
CREATE INDEX "clinical_notes_patientId_createdAt_idx" ON "clinical_notes"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "consents_patientId_createdAt_idx" ON "consents"("patientId", "createdAt");

-- AddForeignKey
ALTER TABLE "tooth_records" ADD CONSTRAINT "tooth_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tooth_records" ADD CONSTRAINT "tooth_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perio_measurements" ADD CONSTRAINT "perio_measurements_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perio_teeth" ADD CONSTRAINT "perio_teeth_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
