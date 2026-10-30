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
