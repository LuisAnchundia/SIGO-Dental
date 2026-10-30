import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  AuthUser,
  Operatory,
  Procedure,
  TreatmentItem,
  TreatmentPlan,
} from '@/types';

interface Item {
  procedureId: string;
  description: string;
  phase: number;
  fee: number;
  labCost: number;
  discount: number;
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

  const total = items.reduce((s, i) => s + i.fee - i.discount, 0);

  const addProc = (id: string) => {
    const p = procedures.find((x) => x.id === id);
    if (!p) return;
    setItems((xs) => [
      ...xs,
      {
        procedureId: p.id,
        description: p.name,
        phase: 1,
        fee: Number(p.basePrice),
        labCost: Number(p.labCost),
        discount: 0,
      },
    ]);
  };

  const setItem = (i: number, patch: Partial<Item>) =>
    setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const createMut = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/patients/${patientId}/treatment-plans`, {
          dentistId,
          items,
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
      <div className="rounded-card border border-border bg-white p-5 space-y-3">
        <h3 className="font-semibold text-text">Nuevo presupuesto</h3>
        <div className="flex flex-wrap gap-3">
          <select
            required
            value={dentistId}
            onChange={(e) => setDentistId(e.target.value)}
            className="rounded-lg border border-border-muted px-3 py-2 text-sm"
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
            className="rounded-lg border border-border-muted px-3 py-2 text-sm"
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
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted">
              <tr>
                <th className="py-1">Fase</th>
                <th className="py-1">Procedimiento</th>
                <th className="py-1 w-24">Honorario</th>
                <th className="py-1 w-24">Lab.</th>
                <th className="py-1 w-24">Desc.</th>
                <th className="py-1 w-20">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={idx}>
                  <td className="py-1">
                    <input
                      type="number"
                      min={1}
                      value={i.phase}
                      onChange={(e) =>
                        setItem(idx, { phase: Number(e.target.value || 1) })
                      }
                      className="w-12 rounded border border-border-muted px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1">{i.description}</td>
                  <td className="py-1">
                    <input
                      type="number"
                      value={i.fee}
                      onChange={(e) =>
                        setItem(idx, { fee: Number(e.target.value || 0) })
                      }
                      className="w-20 rounded border border-border-muted px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1">
                    <input
                      type="number"
                      value={i.labCost}
                      onChange={(e) =>
                        setItem(idx, { labCost: Number(e.target.value || 0) })
                      }
                      className="w-20 rounded border border-border-muted px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1">
                    <input
                      type="number"
                      value={i.discount}
                      onChange={(e) =>
                        setItem(idx, { discount: Number(e.target.value || 0) })
                      }
                      className="w-20 rounded border border-border-muted px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1">${(i.fee - i.discount).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t font-semibold">
                <td colSpan={5} className="py-1 text-right">
                  Total
                </td>
                <td className="py-1">${total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
        <button
          onClick={() => createMut.mutate()}
          disabled={!dentistId || items.length === 0 || createMut.isPending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Crear presupuesto
        </button>
      </div>

      <div className="space-y-3">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-card border border-border bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-text">
                {new Date(plan.createdAt).toLocaleDateString('es-EC')}
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-text-muted">
                  {plan.status}
                </span>
                {plan.status !== 'APROBADO_TOTAL' && (
                  <button
                    onClick={() => approveMut.mutate(plan.id)}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Aprobar todo
                  </button>
                )}
              </div>
            </div>
            <ul className="space-y-1 text-sm">
              {plan.items.map((it) => (
                <PlanItemRow
                  key={it.id}
                  item={it}
                  patientId={patientId}
                  dentistId={plan.dentistId}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// RF-08: un ítem aprobado se puede convertir en una cita agendada.
function PlanItemRow({
  item,
  patientId,
  dentistId,
}: {
  item: TreatmentItem;
  patientId: string;
  dentistId: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [operatoryId, setOperatoryId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [done, setDone] = useState(false);

  const { data: operatories = [] } = useQuery({
    queryKey: ['operatories'],
    queryFn: async () => (await api.get<Operatory[]>('/operatories')).data,
    enabled: open,
  });

  const schedule = useMutation({
    mutationFn: async () => {
      const start = new Date(startsAt);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      return (
        await api.post('/appointments', {
          patientId,
          dentistId,
          operatoryId,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          reason: item.procedure.name,
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      setOpen(false);
      setDone(true);
    },
  });

  return (
    <li className="rounded bg-canvas px-2 py-1">
      <div className="flex items-center justify-between">
        <span>
          {item.isApproved ? '✅ ' : '• '}Fase {item.phase} ·{' '}
          {item.procedure.name}
        </span>
        <span className="flex items-center gap-3">
          <span>${Number(item.fee).toFixed(2)}</span>
          {item.isApproved &&
            (done ? (
              <span className="text-xs font-semibold text-green-600">
                Cita creada
              </span>
            ) : (
              <button
                onClick={() => setOpen((o) => !o)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                {open ? 'Cancelar' : 'Agendar'}
              </button>
            ))}
        </span>
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={operatoryId}
            onChange={(e) => setOperatoryId(e.target.value)}
            className="rounded border border-border-muted px-2 py-1 text-xs"
          >
            <option value="">Sillón…</option>
            {operatories.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="rounded border border-border-muted px-2 py-1 text-xs"
          />
          <button
            onClick={() => schedule.mutate()}
            disabled={!operatoryId || !startsAt || schedule.isPending}
            className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Crear cita
          </button>
          {schedule.isError && (
            <span className="text-xs text-red-600">
              {(schedule.error as any)?.response?.data?.message ?? 'Error'}
            </span>
          )}
        </div>
      )}
    </li>
  );
}
