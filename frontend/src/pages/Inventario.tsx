import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Supply } from '@/types';

export function Inventario() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', unit: 'unidad', stock: '', minStock: '' });
  const [entradas, setEntradas] = useState<Record<string, string>>({});

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: async () => (await api.get<Supply[]>('/supplies')).data,
  });

  const createMut = useMutation({
    mutationFn: async () =>
      (
        await api.post('/supplies', {
          name: form.name,
          unit: form.unit,
          stock: Number(form.stock || 0),
          minStock: Number(form.minStock || 0),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplies'] });
      setForm({ name: '', unit: 'unidad', stock: '', minStock: '' });
    },
  });

  const moveMut = useMutation({
    mutationFn: async (v: { id: string; quantity: number }) =>
      (
        await api.post(`/supplies/${v.id}/movement`, {
          type: 'ENTRADA',
          quantity: v.quantity,
          reason: 'Reposición',
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplies'] }),
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-4">Inventario</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMut.mutate();
        }}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-card bg-white p-5 shadow-card"
      >
        <Field label="Insumo">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Unidad">
          <input
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className={`${inputCls} w-24`}
          />
        </Field>
        <Field label="Stock">
          <input
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            className={`${inputCls} w-24`}
          />
        </Field>
        <Field label="Mínimo">
          <input
            type="number"
            value={form.minStock}
            onChange={(e) => setForm({ ...form, minStock: e.target.value })}
            className={`${inputCls} w-24`}
          />
        </Field>
        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-active"
        >
          Agregar
        </button>
      </form>

      <div className="overflow-hidden rounded-card bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Insumo</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Mínimo</th>
              <th className="px-4 py-3 font-medium">Entrada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {supplies.map((s) => {
              const low = s.stock <= s.minStock;
              return (
                <tr key={s.id} className={low ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3 font-medium text-text">
                    {s.name}
                    {low && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Stock bajo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.stock} {s.unit}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{s.minStock}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        value={entradas[s.id] ?? ''}
                        onChange={(e) =>
                          setEntradas({ ...entradas, [s.id]: e.target.value })
                        }
                        className="w-20 rounded border border-border-muted px-2 py-1"
                      />
                      <button
                        onClick={() => {
                          const q = Number(entradas[s.id]);
                          if (q > 0) moveMut.mutate({ id: s.id, quantity: q });
                          setEntradas({ ...entradas, [s.id]: '' });
                        }}
                        className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                      >
                        + Entrada
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputCls =
  'rounded-lg border border-border-muted px-3 py-2 text-sm focus:border-brand focus:outline-none';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
