import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CashSession } from '@/types';

export function Caja() {
  const qc = useQueryClient();
  const [opening, setOpening] = useState('');
  const [counted, setCounted] = useState('');
  const [result, setResult] = useState<CashSession | null>(null);

  const { data: current, isLoading } = useQuery({
    queryKey: ['cash-current'],
    queryFn: async () =>
      (await api.get<CashSession | null>('/cash/current')).data,
  });

  const openMut = useMutation({
    mutationFn: async () =>
      (await api.post('/cash/open', { openingAmount: Number(opening) })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-current'] });
      setOpening('');
      setResult(null);
    },
  });

  const closeMut = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/cash/${current!.id}/close`, {
          countedAmount: Number(counted),
        })
      ).data as CashSession,
    onSuccess: (data) => {
      setResult(data);
      setCounted('');
      qc.invalidateQueries({ queryKey: ['cash-current'] });
    },
  });

  if (isLoading) return <p className="text-slate-400">Cargando…</p>;

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Caja</h2>

      {!current ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-800">Abrir caja</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Fondo inicial"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => openMut.mutate()}
              disabled={!opening || openMut.isPending}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Abrir
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-1 font-semibold text-slate-800">Caja abierta</h3>
          <p className="text-sm text-slate-500">
            Fondo inicial: ${Number(current.openingAmount).toFixed(2)} · desde{' '}
            {new Date(current.openedAt).toLocaleString('es-EC')}
          </p>
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            🔒 <strong>Cierre ciego (RN-02):</strong> ingrese el conteo físico
            del efectivo. El total teórico se revela solo después.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              placeholder="Conteo físico de efectivo"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => closeMut.mutate()}
              disabled={!counted || closeMut.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Cerrar caja
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-2 font-semibold text-slate-800">Resultado del cierre</h3>
          <dl className="space-y-1 text-sm">
            <Row label="Contado (físico)" value={result.countedAmount} />
            <Row label="Esperado (teórico)" value={result.expectedAmount} />
            <div className="flex justify-between border-t pt-1 font-semibold">
              <dt>Diferencia</dt>
              <dd
                className={
                  Number(result.difference) === 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                ${Number(result.difference).toFixed(2)}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800">${Number(value ?? 0).toFixed(2)}</dd>
    </div>
  );
}
