import type { Role } from '@/types';

// Espejo de los @Roles() del backend (RBAC — RNF-05). Mantener sincronizado:
// esto solo oculta la UI que el usuario no podría usar de todas formas; el
// backend es quien realmente hace cumplir el permiso en cada endpoint.

// Secciones del menú lateral visibles por rol.
export const NAV_ACCESS: Record<string, Role[]> = {
  '/': ['ADMIN_TI', 'RECEPCION', 'ODONTOLOGO', 'ASISTENTE', 'AUDITOR'],
  '/pacientes': ['ADMIN_TI', 'RECEPCION', 'ODONTOLOGO', 'ASISTENTE', 'AUDITOR'],
  '/agenda': ['ADMIN_TI', 'RECEPCION', 'ODONTOLOGO', 'ASISTENTE'],
  '/facturacion': ['ADMIN_TI', 'RECEPCION'],
  '/caja': ['ADMIN_TI', 'RECEPCION'],
  '/inventario': ['ADMIN_TI', 'ASISTENTE'],
  '/reportes': ['ADMIN_TI', 'AUDITOR', 'RECEPCION'],
  '/seguridad': ['ADMIN_TI', 'RECEPCION', 'ODONTOLOGO', 'ASISTENTE', 'AUDITOR'],
};

export function canAccess(path: string, role?: Role): boolean {
  if (!role) return false;
  const allowed = NAV_ACCESS[path];
  return allowed ? allowed.includes(role) : true;
}

// Acciones de escritura puntuales (crear/editar/cobrar), igual a los
// @Roles() del backend en cada endpoint.
export const CAN = {
  createPatient: (r?: Role) =>
    !!r && ['ADMIN_TI', 'RECEPCION', 'ODONTOLOGO'].includes(r),
  createAppointment: (r?: Role) =>
    !!r && ['ADMIN_TI', 'RECEPCION', 'ODONTOLOGO'].includes(r),
  changeAppointmentStatus: (r?: Role) =>
    !!r && ['ADMIN_TI', 'RECEPCION', 'ODONTOLOGO', 'ASISTENTE'].includes(r),
  issueInvoice: (r?: Role) => !!r && ['ADMIN_TI', 'RECEPCION'].includes(r),
  registerPayment: (r?: Role) => !!r && ['ADMIN_TI', 'RECEPCION'].includes(r),
  manageCash: (r?: Role) => !!r && ['ADMIN_TI', 'RECEPCION'].includes(r),
  manageInventory: (r?: Role) => !!r && r === 'ADMIN_TI',
  // Pestañas clínicas del expediente (también visibles para todos los roles)
  editOdontogram: (r?: Role) =>
    !!r && ['ADMIN_TI', 'ODONTOLOGO', 'ASISTENTE'].includes(r),
  editPerio: (r?: Role) =>
    !!r && ['ADMIN_TI', 'ODONTOLOGO', 'ASISTENTE'].includes(r),
  createSoepNote: (r?: Role) => !!r && ['ADMIN_TI', 'ODONTOLOGO'].includes(r),
  createConsent: (r?: Role) =>
    !!r && ['ADMIN_TI', 'ODONTOLOGO', 'RECEPCION'].includes(r),
  createTreatmentPlan: (r?: Role) =>
    !!r && ['ADMIN_TI', 'ODONTOLOGO'].includes(r),
  approveTreatmentPlan: (r?: Role) =>
    !!r && ['ADMIN_TI', 'ODONTOLOGO', 'RECEPCION'].includes(r),
  uploadAttachment: (r?: Role) =>
    !!r && ['ADMIN_TI', 'ODONTOLOGO', 'ASISTENTE', 'RECEPCION'].includes(r),
  deleteAttachment: (r?: Role) => !!r && ['ADMIN_TI', 'ODONTOLOGO'].includes(r),
} as const;
