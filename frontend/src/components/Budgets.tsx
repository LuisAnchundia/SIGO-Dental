import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuthUser, Procedure, TreatmentPlan } from '@/types';

interface Item {
  procedureId: string;
  description: string;
  phase: number;
  fee: number;
}

export function Budgets({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [dentistId, setDentistId] = useState('');
  const [items, setItems] = useState<Item[]>([]);

  const { data: plans = [] } = useQuery({
    queryKey: ['plans', patientId],
    queryFn: async () =>
      (await api.get<TreatmentPlan[]>(`/patients/${patientId}/treatment-plans`))
        .data,
  });
  const { data: dentists = [] } = useQuery({
    queryKey: ['dentists'],
    queryFn: async () =>
      (await api.get<AuthUser[]>('/users', { params: { role: 'ODONTOLOGO' } }))
        .data,
  });
  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures'],
    queryFn: async () => (await api.get<Procedure[]>('/procedures')).data,
  });

  const total = items.reduce((s, i) => s + i.fee, 0);

  const addProc = (id: string) => {
    const p = procedures.find((x) => x.id === id);
    if (!p) return;
    setItems((xs) => [
      ...xs,
      { procedureId: p.id, description: p.name, phase: 1, fee: Number(p.basePrice) },
    ]);
  };

  const createMut = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/patients/${patientId}/treatment-plans`, {
          dentistId,
          items: items.map((i) => ({
            procedureId: i.procedureId,
            phase: i.phase,
            fee: i.fee,
          })),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans', patientId] });
      setItems([]);
    },
  });

  const approveMut = useMutation({
    mutationFn: async (planId: string) =>
      (await api.patch(`/treatment-plans/${planId}/approve`, { approveAll: true }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans', patientId] }),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-slate-800">Nuevo presupuesto</h3>
        <div className="flex flex-wrap gap-3">
          <select
            required
            value={dentistId}
            onChange={(e) => setDentistId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Odontólogo…</option>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </select>
          <select
            value=""
            onChange={(e) => addProc(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Agregar procedimiento…</option>
            {procedures.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (${p.basePrice})
              </option>
            ))}
          </select>
        </div>
        {items.length > 0 && (
          <ul className="text-sm text-slate-700">
            {items.map((i, idx) => (
              <li key={idx} className="flex justify-between py-0.5">
                <span>
                  Fase {i.phase} · {i.description}
                </span>
                <span>${i.fee.toFixed(2)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t pt-1 font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </li>
          </ul>
        )}
        <button
          onClick={() => createMut.mutate()}
          disabled={!dentistId || items.length === 0 || createMut.isPending}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Crear presupuesto
        </button>
      </div>

      <div className="space-y-3">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                {new Date(plan.createdAt).toLocaleDateString('es-EC')}
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {plan.status}
                </span>
                {plan.status !== 'APROBADO_TOTAL' && (
                  <button
                    onClick={() => approveMut.mutate(plan.id)}
                    className="text-xs font-semibold text-teal-700 hover:underline"
                  >
                    Aprobar todo
                  </button>
                )}
              </div>
            </div>
            <ul className="text-sm">
              {plan.items.map((it) => (
                <li key={it.id} className="flex justify-between py-0.5">
                  <span>
                    {it.isApproved ? '✅ ' : '• '}Fase {it.phase} ·{' '}
                    {it.procedure.name}
                  </span>
                  <span>${Number(it.fee).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
