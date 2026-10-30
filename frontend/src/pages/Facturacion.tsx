import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  AuthUser,
  Invoice,
  Patient,
  PaymentMethod,
  Procedure,
} from '@/types';

interface Line {
  procedureId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

const METHODS: PaymentMethod[] = [
  'EFECTIVO',
  'TARJETA_CREDITO',
  'TARJETA_DEBITO',
  'TRANSFERENCIA',
  'SEGURO',
];

export function Facturacion() {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState('');
  const [dentistId, setDentistId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState('');

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
  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures'],
    queryFn: async () => (await api.get<Procedure[]>('/procedures')).data,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get<Invoice[]>('/invoices')).data,
  });

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const addProcedure = (id: string) => {
    const p = procedures.find((x) => x.id === id);
    if (!p) return;
    setLines((ls) => [
      ...ls,
      {
        procedureId: p.id,
        description: p.name,
        quantity: 1,
        unitPrice: Number(p.basePrice),
      },
    ]);
  };

  const createMut = useMutation({
    mutationFn: async () =>
      (
        await api.post('/invoices', {
          patientId,
          dentistId: dentistId || undefined,
          items: lines,
          tax: 0,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setLines([]);
      setError('');
    },
    onError: (e: any) =>
      setError(e.response?.data?.message ?? 'No se pudo emitir'),
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-text mb-4">Facturación</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMut.mutate();
        }}
        className="mb-6 rounded-card bg-white p-6 shadow-card space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className={labelCls}>Paciente</span>
            <select
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
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
            <span className={labelCls}>Odontólogo (honorarios)</span>
            <select
              value={dentistId}
              onChange={(e) => setDentistId(e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Agregar procedimiento</span>
            <select
              value=""
              onChange={(e) => addProcedure(e.target.value)}
              className={inputCls}
            >
              <option value="">Elegir del catálogo…</option>
              {procedures.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name} (${p.basePrice})
                </option>
              ))}
            </select>
          </label>
        </div>

        {lines.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted">
              <tr>
                <th className="py-1">Concepto</th>
                <th className="py-1 w-20">Cant.</th>
                <th className="py-1 w-28">P. unit.</th>
                <th className="py-1 w-28">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-1">{l.description}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) =>
                        setLines((ls) =>
                          ls.map((x, j) =>
                            j === i
                              ? { ...x, quantity: Number(e.target.value || 1) }
                              : x,
                          ),
                        )
                      }
                      className="w-16 rounded border border-border-muted px-2 py-1"
                    />
                  </td>
                  <td>${l.unitPrice.toFixed(2)}</td>
                  <td>${(l.quantity * l.unitPrice).toFixed(2)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        setLines((ls) => ls.filter((_, j) => j !== i))
                      }
                      className="text-xs text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text">
            Subtotal: ${subtotal.toFixed(2)}
          </span>
          {error && <span className="text-sm text-red-600">{error}</span>}
          <button
            type="submit"
            disabled={createMut.isPending || lines.length === 0 || !patientId}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-active disabled:opacity-50"
          >
            Emitir factura
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {invoices.map((inv) => (
          <InvoiceRow key={inv.id} invoice={inv} />
        ))}
      </div>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod>('EFECTIVO');
  const [amount, setAmount] = useState('');

  const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const pending = Number(invoice.total) - paid;

  const payMut = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/invoices/${invoice.id}/payments`, {
          method,
          amount: Number(amount),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setAmount('');
    },
  });

  const authMut = useMutation({
    mutationFn: async () =>
      (await api.post(`/invoices/${invoice.id}/authorize`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const STATUS: Record<string, string> = {
    EMITIDA: 'bg-amber-100 text-amber-700',
    PARCIAL: 'bg-blue-100 text-blue-700',
    PAGADA: 'bg-green-100 text-green-700',
    ANULADA: 'bg-red-100 text-red-700',
  };

  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-text">{invoice.number}</span>
          <span className="ml-2 text-sm text-text-muted">
            {invoice.patient?.firstName} {invoice.patient?.lastName}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span>Total: ${Number(invoice.total).toFixed(2)}</span>
          <span className="text-text-muted">
            Pagado: ${paid.toFixed(2)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[invoice.status]}`}
          >
            {invoice.status}
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs">
        {invoice.authorizationNumber ? (
          <span className="font-medium text-green-700">
            ✓ Autorizada (SRI): {invoice.authorizationNumber.slice(0, 20)}…
          </span>
        ) : (
          <button
            onClick={() => authMut.mutate()}
            disabled={authMut.isPending}
            className="font-semibold text-brand hover:underline disabled:opacity-50"
          >
            Timbrar factura (autorizar)
          </button>
        )}
      </div>
      {pending > 0.009 && (
        <div className="mt-2 flex items-center gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="rounded border border-border-muted px-2 py-1 text-sm"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder={`Pendiente ${pending.toFixed(2)}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-32 rounded border border-border-muted px-2 py-1 text-sm"
          />
          <button
            onClick={() => payMut.mutate()}
            disabled={!amount || payMut.isPending}
            className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
          >
            Registrar pago
          </button>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-border-muted px-3 py-2 text-sm focus:border-brand focus:outline-none';
const labelCls = 'mb-1 block text-sm font-medium text-text';
