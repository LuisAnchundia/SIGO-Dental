import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Consent } from '@/types';

// Pad de firma biométrica en pantalla táctil / mouse (RF-06).
function SignaturePad({
  canvasRef,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  const drawing = useRef(false);

  const pos = (e: PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: PointerEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  const end = () => (drawing.current = false);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={120}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerLeave={end}
      className="touch-none rounded-lg border border-border-muted bg-white"
    />
  );
}

export function Consents({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [form, setForm] = useState({
    title: '',
    body: '',
    method: 'FIRMA_BIOMETRICA' as 'FIRMA_BIOMETRICA' | 'OTP',
    patientSignerName: '',
  });

  const { data: consents = [] } = useQuery({
    queryKey: ['consents', patientId],
    queryFn: async () =>
      (await api.get<Consent[]>(`/patients/${patientId}/consents`)).data,
  });

  const clearSignature = () => {
    const c = canvasRef.current;
    if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
  };

  const mut = useMutation({
    mutationFn: async () => {
      const signatureDataUrl =
        form.method === 'FIRMA_BIOMETRICA'
          ? canvasRef.current?.toDataURL('image/png')
          : undefined;
      return (
        await api.post(`/patients/${patientId}/consents`, {
          ...form,
          signatureDataUrl,
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consents', patientId] });
      setForm({ ...form, title: '', body: '', patientSignerName: '' });
      clearSignature();
    },
  });

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        className="rounded-card border border-border bg-white p-5 space-y-3"
      >
        <h3 className="font-semibold text-text">
          Nuevo consentimiento informado
        </h3>
        <input
          required
          placeholder="Título (ej. Consentimiento para extracción)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-lg border border-border-muted px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <textarea
          required
          rows={3}
          placeholder="Texto legal del consentimiento…"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full rounded-lg border border-border-muted px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={form.method}
            onChange={(e) =>
              setForm({ ...form, method: e.target.value as typeof form.method })
            }
            className="rounded-lg border border-border-muted px-3 py-2 text-sm"
          >
            <option value="FIRMA_BIOMETRICA">Firma biométrica</option>
            <option value="OTP">Código OTP</option>
          </select>
          <input
            placeholder="Nombre de quien firma"
            value={form.patientSignerName}
            onChange={(e) =>
              setForm({ ...form, patientSignerName: e.target.value })
            }
            className="rounded-lg border border-border-muted px-3 py-2 text-sm"
          />
        </div>

        {form.method === 'FIRMA_BIOMETRICA' && (
          <div>
            <span className="mb-1 block text-sm font-medium text-text">
              Firma del paciente
            </span>
            <SignaturePad canvasRef={canvasRef} />
            <button
              type="button"
              onClick={clearSignature}
              className="mt-1 block text-xs text-text-muted hover:underline"
            >
              Limpiar firma
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={mut.isPending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-active disabled:opacity-60"
        >
          {mut.isPending ? 'Guardando…' : 'Registrar consentimiento'}
        </button>
      </form>

      <div className="space-y-3">
        {consents.length === 0 && (
          <p className="text-sm text-text-muted">Sin consentimientos.</p>
        )}
        {consents.map((c) => (
          <div
            key={c.id}
            className="rounded-card border border-border bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-text">{c.title}</h4>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  c.signedAt
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {c.signedAt ? 'Firmado' : 'Pendiente'}
              </span>
            </div>
            <p className="mt-1 text-sm text-text-muted">{c.body}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
              <span>Método: {c.method}</span>
              {c.patientSignerName && <span>Firma: {c.patientSignerName}</span>}
              <span>{new Date(c.createdAt).toLocaleString('es-EC')}</span>
            </div>
            {c.signatureDataUrl && (
              <img
                src={c.signatureDataUrl}
                alt="Firma"
                className="mt-2 h-16 rounded border border-border bg-white"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
