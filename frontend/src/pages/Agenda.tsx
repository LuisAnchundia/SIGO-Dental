import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Appointment,
  AppointmentStatus,
  AuthUser,
  Operatory,
  Patient,
} from '@/types';

const STATUSES: AppointmentStatus[] = [
  'PROGRAMADO',
  'CONFIRMADO',
  'EN_SALA_ESPERA',
  'EN_ATENCION',
  'ATENDIDO',
  'CANCELADO',
  'NO_ASISTIO',
];

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  PROGRAMADO: 'bg-slate-100 text-slate-700',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  EN_SALA_ESPERA: 'bg-amber-100 text-amber-700',
  EN_ATENCION: 'bg-teal-100 text-teal-700',
  ATENDIDO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
  NO_ASISTIO: 'bg-red-100 text-red-700',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function Agenda() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    patientId: '',
    dentistId: '',
    operatoryId: '',
    startsAt: '',
    endsAt: '',
    reason: '',
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => (await api.get<Appointment[]>('/appointments')).data,
  });
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => (await api.get<Patient[]>('/patients')).data,
  });
  const { data: dentists = [] } = useQuery({
    queryKey: ['dentists'],
    queryFn: async () =>
      (await api.get<AuthUser[]>('/users', { params: { role: 'ODONTOLOGO' } }))
        .data,
  });
  const { data: operatories = [] } = useQuery({
    queryKey: ['operatories'],
    queryFn: async () => (await api.get<Operatory[]>('/operatories')).data,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const payload = {
        patientId: form.patientId,
        dentistId: form.dentistId,
        operatoryId: form.operatoryId,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        reason: form.reason || undefined,
      };
      return (await api.post('/appointments', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      setForm({ ...form, startsAt: '', endsAt: '', reason: '' });
      setError('');
    },
    onError: (e: any) =>
      setError(e.response?.data?.message ?? 'No se pudo agendar'),
  });

  const statusMut = useMutation({
    mutationFn: async (v: { id: string; status: AppointmentStatus }) =>
      (await api.patch(`/appointments/${v.id}/status`, { status: v.status }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-4">Agenda de citas</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMut.mutate();
        }}
        className="mb-6 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className={labelCls}>Paciente</span>
            <select
              required
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              className={inputCls}
            >
              <option value="">Seleccione…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Odontólogo</span>
            <select
              required
              value={form.dentistId}
              onChange={(e) => setForm({ ...form, dentistId: e.target.value })}
              className={inputCls}
            >
              <option value="">Seleccione…</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Sillón</span>
            <select
              required
              value={form.operatoryId}
              onChange={(e) => setForm({ ...form, operatoryId: e.target.value })}
              className={inputCls}
            >
              <option value="">Seleccione…</option>
              {operatories.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Inicio</span>
            <input
              required
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Fin</span>
            <input
              required
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Motivo</span>
            <input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className={inputCls}
            />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={createMut.isPending}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {createMut.isPending ? 'Agendando…' : 'Agendar cita'}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Horario</th>
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">Odontólogo</th>
              <th className="px-4 py-3 font-medium">Sillón</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Sin citas agendadas
                </td>
              </tr>
            ) : (
              appointments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {fmt(a.startsAt)} – {fmt(a.endsAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {a.patient.firstName} {a.patient.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {a.dentist.fullName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.operatory.name}</td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      onChange={(e) =>
                        statusMut.mutate({
                          id: a.id,
                          status: e.target.value as AppointmentStatus,
                        })
                      }
                      className={`rounded-full border-0 px-2 py-1 text-xs font-semibold ${STATUS_STYLE[a.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
const labelCls = 'mb-1 block text-sm font-medium text-slate-700';
