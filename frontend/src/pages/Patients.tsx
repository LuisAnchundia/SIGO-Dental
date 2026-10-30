import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Patient } from '@/types';

interface FormState {
  documentId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  phone: string;
  email: string;
  allergies: string;
  penicillinAllergy: boolean;
  isAnticoagulated: boolean;
  coagulopathies: boolean;
}

const EMPTY: FormState = {
  documentId: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: 'MASCULINO',
  phone: '',
  email: '',
  allergies: '',
  penicillinAllergy: false,
  isAnticoagulated: false,
  coagulopathies: false,
};

// Badge de alerta médica de alta visibilidad (RF-02).
function AlertBadge({ alerts }: { alerts: string[] }) {
  if (!alerts.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {alerts.map((a) => (
        <span
          key={a}
          className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700"
        >
          ⚠ {a}
        </span>
      ))}
    </div>
  );
}

export function Patients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: async () =>
      (await api.get<Patient[]>('/patients', { params: { search } })).data,
  });

  const createMut = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        documentId: f.documentId,
        firstName: f.firstName,
        lastName: f.lastName,
        birthDate: new Date(f.birthDate).toISOString(),
        gender: f.gender,
        phone: f.phone || undefined,
        email: f.email || undefined,
        medicalHistory: {
          allergies: f.allergies || undefined,
          penicillinAllergy: f.penicillinAllergy,
          isAnticoagulated: f.isAnticoagulated,
          coagulopathies: f.coagulopathies,
        },
      };
      return (await api.post('/patients', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      setForm(EMPTY);
      setShowForm(false);
      setError('');
    },
    onError: (e: any) => {
      setError(e.response?.data?.message ?? 'No se pudo guardar');
    },
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Pacientes</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          {showForm ? 'Cerrar' : 'Nuevo paciente'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate(form);
          }}
          className="mb-6 rounded-2xl bg-white p-6 shadow-sm space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Identificación">
              <input
                required
                value={form.documentId}
                onChange={(e) => set('documentId', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Nombres">
              <input
                required
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Apellidos">
              <input
                required
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Fecha de nacimiento">
              <input
                required
                type="date"
                value={form.birthDate}
                onChange={(e) => set('birthDate', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Sexo">
              <select
                value={form.gender}
                onChange={(e) => set('gender', e.target.value as FormState['gender'])}
                className={inputCls}
              >
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
                <option value="OTRO">Otro</option>
              </select>
            </Field>
            <Field label="Teléfono">
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Correo">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Alergias a fármacos">
              <input
                value={form.allergies}
                onChange={(e) => set('allergies', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            <Check
              label="Alergia a penicilina"
              checked={form.penicillinAllergy}
              onChange={(v) => set('penicillinAllergy', v)}
            />
            <Check
              label="Anticoagulado"
              checked={form.isAnticoagulated}
              onChange={(v) => set('isAnticoagulated', v)}
            />
            <Check
              label="Coagulopatía"
              checked={form.coagulopathies}
              onChange={(v) => set('coagulopathies', v)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {createMut.isPending ? 'Guardando…' : 'Guardar paciente'}
          </button>
        </form>
      )}

      <input
        placeholder="Buscar por nombre o identificación…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
      />

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Identificación</th>
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  Sin pacientes
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{p.documentId}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">
                      {p.firstName} {p.lastName}
                    </span>
                    <AlertBadge alerts={p.medicalHistory?.criticalAlerts ?? []} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.phone ?? '—'}
                    {p.email ? ` · ${p.email}` : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none';

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-teal-600"
      />
      {label}
    </label>
  );
}
