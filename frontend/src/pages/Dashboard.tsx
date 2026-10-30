import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Appointment, Patient } from '@/types';

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => (await api.get<Patient[]>('/patients')).data,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => (await api.get<Appointment[]>('/appointments')).data,
  });

  const withAlerts = patients.filter(
    (p) => (p.medicalHistory?.criticalAlerts?.length ?? 0) > 0,
  ).length;

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900">
        Bienvenido/a, {user?.fullName}
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Panel general de la clínica
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card label="Pacientes registrados" value={patients.length} />
        <Card label="Citas en agenda" value={appointments.length} />
        <Card label="Pacientes con alertas médicas" value={withAlerts} />
      </div>
    </div>
  );
}
