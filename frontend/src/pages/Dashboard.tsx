import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Appointment, Patient } from '@/types';

function Icon({ name, className = 'text-[22px]' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function StatCard({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  icon: string;
  tone: 'brand' | 'info' | 'critical';
  hint: string;
}) {
  const tones = {
    brand: { bg: 'bg-brand-container', text: 'text-brand-on-container', value: 'text-text' },
    info: { bg: 'bg-info-bg', text: 'text-info', value: 'text-text' },
    critical: { bg: 'bg-critical-bg', text: 'text-critical', value: 'text-critical' },
  } as const;
  const t = tones[tone];
  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${t.bg} ${t.text}`}>
          <Icon name={icon} />
        </div>
      </div>
      <p className={`font-headline text-4xl font-bold tracking-tight ${t.value}`}>{value}</p>
      <p className="mt-1.5 text-sm text-text-muted">{hint}</p>
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

  const upcoming = appointments
    .filter((a) => new Date(a.startsAt) > new Date() && a.status !== 'CANCELADO')
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    .slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand" />
        <span className="text-xs font-semibold uppercase tracking-widest text-brand">
          Panel de operaciones
        </span>
      </div>
      <h1 className="font-headline text-3xl font-bold tracking-tight text-text">
        Bienvenido/a, {user?.fullName}
      </h1>
      <p className="mb-6 mt-1 text-sm text-text-muted">Resumen general de la clínica</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Pacientes registrados"
          value={patients.length}
          icon="folder_shared"
          tone="brand"
          hint="Expedientes con historial clínico"
        />
        <StatCard
          label="Citas en agenda"
          value={appointments.length}
          icon="event_available"
          tone="info"
          hint="Programadas y en curso"
        />
        <StatCard
          label="Pacientes con alertas médicas"
          value={withAlerts}
          icon="warning"
          tone="critical"
          hint="Alergias, anticoagulados y coagulopatías"
        />
      </div>

      <div className="mt-6 rounded-card bg-white p-6 shadow-card">
        <h2 className="font-headline mb-4 text-lg font-semibold text-text">
          Próximas citas
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-text-muted">No hay citas próximas programadas.</p>
        ) : (
          <div className="divide-y divide-border">
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-text">
                    {a.patient.firstName} {a.patient.lastName}
                  </p>
                  <p className="text-xs text-text-muted">
                    {a.dentist.fullName} · {a.operatory.name}
                  </p>
                </div>
                <span className="font-mono-data text-sm text-text-muted">
                  {new Date(a.startsAt).toLocaleString('es-EC', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
