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
