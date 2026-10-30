export type Role =
  | 'ADMIN_TI'
  | 'RECEPCION'
  | 'ODONTOLOGO'
  | 'ASISTENTE'
  | 'AUDITOR';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  mfaEnabled?: boolean;
}

export interface MedicalHistory {
  allergies?: string;
  coagulopathies?: boolean;
  isAnticoagulated?: boolean;
  penicillinAllergy?: boolean;
  criticalAlerts: string[];
}

export interface Patient {
  id: string;
  documentId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  phone?: string;
  email?: string;
  medicalHistory?: MedicalHistory | null;
}

export type AppointmentStatus =
  | 'PROGRAMADO'
  | 'CONFIRMADO'
  | 'EN_SALA_ESPERA'
  | 'EN_ATENCION'
  | 'ATENDIDO'
  | 'CANCELADO'
  | 'NO_ASISTIO';

export interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason?: string;
  patient: Patient;
  dentist: AuthUser;
  operatory: { id: string; name: string };
}

export interface Operatory {
  id: string;
  name: string;
}

// ---- Fase 2: core clínico ----

export type ToothSurface =
  | 'MESIAL'
  | 'DISTAL'
  | 'OCLUSAL'
  | 'VESTIBULAR'
  | 'LINGUAL'
  | 'GENERAL';

export type ToothCondition =
  | 'SANO'
  | 'CARIES'
  | 'RESTAURACION'
  | 'ENDODONCIA'
  | 'IMPLANTE'
  | 'PROTESIS_FIJA'
  | 'PROTESIS_REMOVIBLE'
  | 'EXODONCIA'
  | 'SELLANTE'
  | 'CORONA';

export interface ToothRecord {
  id: string;
  toothNumber: string;
  surface: ToothSurface;
  condition: ToothCondition;
  dentition: 'PERMANENTE' | 'TEMPORAL';
}

export type PerioSite = 'MV' | 'V' | 'DV' | 'MP' | 'P' | 'DP';

export interface PerioMeasurement {
  id: string;
  toothNumber: string;
  site: PerioSite;
  probingDepth: number;
  gingivalMargin: number;
  bleeding: boolean;
}

export interface PerioTooth {
  id: string;
  toothNumber: string;
  mobility: number;
  furcation: number;
}

export interface ClinicalNote {
  id: string;
  subjective: string;
  objective: string;
  evaluation: string;
  plan: string;
  signedAt: string;
  lockedAt: string;
  createdAt: string;
  author: { id: string; fullName: string };
}

export interface Consent {
  id: string;
  title: string;
  body: string;
  method: 'FIRMA_BIOMETRICA' | 'OTP';
  signatureDataUrl?: string | null;
  patientSignerName?: string | null;
  signedAt?: string | null;
  createdAt: string;
}

// ---- Fase 3: finanzas ----

export type PaymentMethod =
  | 'EFECTIVO'
  | 'TARJETA_CREDITO'
  | 'TARJETA_DEBITO'
  | 'TRANSFERENCIA'
  | 'SEGURO';

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: string;
}

export interface Procedure {
  id: string;
  code: string;
  name: string;
  basePrice: string;
  labCost: string;
}

export interface Invoice {
  id: string;
  number: string;
  status: 'EMITIDA' | 'PAGADA' | 'PARCIAL' | 'ANULADA';
  subtotal: string;
  tax: string;
  total: string;
  issuedAt: string;
  patient?: { firstName: string; lastName: string };
  payments: Payment[];
}

export interface Supply {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  lowStock?: boolean;
}

export interface CashSession {
  id: string;
  openingAmount: string;
  openedAt: string;
  countedAmount?: string | null;
  expectedAmount?: string | null;
  difference?: string | null;
  status?: 'ABIERTA' | 'CERRADA';
}

export interface CommissionRow {
  dentistId: string;
  dentist: string;
  type: string;
  value: number;
  base: number;
  labCost: number;
  procedures: number;
  commission: number;
}

export interface TreatmentItem {
  id: string;
  phase: number;
  toothNumber?: string | null;
  fee: string;
  labCost: string;
  discount: string;
  isApproved: boolean;
  procedure: { name: string; code: string };
}

export interface TreatmentPlan {
  id: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  items: TreatmentItem[];
}
