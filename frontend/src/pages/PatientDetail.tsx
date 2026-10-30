import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Patient } from '@/types';
import { Odontogram } from '@/components/Odontogram';
import { Periodontogram } from '@/components/Periodontogram';
import { SoepNotes } from '@/components/SoepNotes';
import { Consents } from '@/components/Consents';
import { Budgets } from '@/components/Budgets';
import { Attachments } from '@/components/Attachments';

const TABS = [
  'Ficha',
  'Odontograma',
  'Periodontograma',
  'Notas SOEP',
  'Consentimientos',
  'Presupuestos',
  'Archivos',
] as const;
type Tab = (typeof TABS)[number];

export function PatientDetail() {
  const { id = '' } = useParams();
  const [tab, setTab] = useState<Tab>('Odontograma');

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => (await api.get<Patient>(`/patients/${id}`)).data,
  });

  if (isLoading || !patient) {
    return <p className="text-text-muted">Cargando expediente…</p>;
  }

  const alerts = patient.medicalHistory?.criticalAlerts ?? [];

  return (
    <div>
      <Link to="/pacientes" className="text-sm text-brand hover:underline">
        ← Volver a pacientes
      </Link>

      {/* Cabecera del expediente con badge de alerta (RF-02) */}
      <div className="mt-2 mb-4 rounded-card bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-text">
              {patient.firstName} {patient.lastName}
            </h2>
            <p className="text-sm text-text-muted">
              {patient.documentId} ·{' '}
              {new Date(patient.birthDate).toLocaleDateString('es-EC')} ·{' '}
              {patient.gender}
            </p>
          </div>
          {alerts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {alerts.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700"
                >
                  ⚠ {a}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pestañas */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t
                ? 'border-brand text-brand'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Ficha' && <Ficha patient={patient} />}
      {tab === 'Odontograma' && <Odontogram patientId={id} />}
      {tab === 'Periodontograma' && <Periodontogram patientId={id} />}
      {tab === 'Notas SOEP' && <SoepNotes patientId={id} />}
      {tab === 'Consentimientos' && <Consents patientId={id} />}
      {tab === 'Presupuestos' && <Budgets patientId={id} />}
      {tab === 'Archivos' && <Attachments patientId={id} />}
    </div>
  );
}

function Ficha({ patient }: { patient: Patient }) {
  const mh = patient.medicalHistory;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card title="Datos de contacto">
        <Row label="Teléfono" value={patient.phone} />
        <Row label="Correo" value={patient.email} />
      </Card>
      <Card title="Antecedentes médicos (anamnesis)">
        <Row label="Alergias" value={mh?.allergies} />
        <Row
          label="Alergia a penicilina"
          value={mh?.penicillinAllergy ? 'Sí' : 'No'}
        />
        <Row
          label="Anticoagulado"
          value={mh?.isAnticoagulated ? 'Sí' : 'No'}
        />
        <Row label="Coagulopatía" value={mh?.coagulopathies ? 'Sí' : 'No'} />
      </Card>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <h3 className="mb-2 font-semibold text-text">{title}</h3>
      <dl className="space-y-1 text-sm">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text">{value || '—'}</dd>
    </div>
  );
}
