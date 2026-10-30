import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CommissionRow, Supply } from '@/types';

interface CashClose {
  total: number;
  count: number;
  byMethod: Record<string, number>;
}

export function Reportes() {
  const { data: cash } = useQuery({
    queryKey: ['rep-cash'],
    queryFn: async () =>
      (await api.get<CashClose>('/reports/cash-close')).data,
  });
  const { data: commissions = [] } = useQuery({
    queryKey: ['rep-commissions'],
    queryFn: async () =>
      (await api.get<CommissionRow[]>('/reports/commissions')).data,
  });
  const { data: inventory = [] } = useQuery({
    queryKey: ['rep-inventory'],
    queryFn: async () => (await api.get<Supply[]>('/reports/inventory')).data,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Reportes</h2>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-800">Corte de caja</h3>
        {cash && (
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-slate-500">Total recaudado</p>
              <p className="text-2xl font-bold text-slate-900">
                ${cash.total.toFixed(2)}
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {Object.entries(cash.byMethod).map(([m, v]) => (
                <div key={m}>
                  <p className="text-slate-500">{m}</p>
                  <p className="font-semibold text-slate-800">
                    ${v.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-800">
          Liquidación de honorarios (RF-13)
        </h3>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2">Profesional</th>
              <th className="py-2">Tipo</th>
              <th className="py-2">Base</th>
              <th className="py-2">Comisión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {commissions.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  Sin datos en el período
                </td>
              </tr>
            ) : (
              commissions.map((c) => (
                <tr key={c.dentistId}>
                  <td className="py-2 font-medium text-slate-800">
                    {c.dentist}
                  </td>
                  <td className="py-2 text-slate-600">
                    {c.type} ({c.value})
                  </td>
                  <td className="py-2">${c.base.toFixed(2)}</td>
                  <td className="py-2 font-semibold text-teal-700">
                    ${c.commission.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-800">Inventario</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2">Insumo</th>
              <th className="py-2">Stock</th>
              <th className="py-2">Mínimo</th>
              <th className="py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inventory.map((s) => (
              <tr key={s.id}>
                <td className="py-2 font-medium text-slate-800">{s.name}</td>
                <td className="py-2">
                  {s.stock} {s.unit}
                </td>
                <td className="py-2 text-slate-500">{s.minStock}</td>
                <td className="py-2">
                  {s.lowStock ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Reponer
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      OK
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
