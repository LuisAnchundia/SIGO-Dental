import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { CAN } from '@/lib/permissions';
import type { ClinicalNote } from '@/types';

const EMPTY = { subjective: '', objective: '', evaluation: '', plan: '' };

export function SoepNotes({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const canCreate = CAN.createSoepNote(useAuthStore((s) => s.user?.role));
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', patientId],
    queryFn: async () =>
      (await api.get<ClinicalNote[]>(`/patients/${patientId}/notes`)).data,
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (editId) return (await api.patch(`/notes/${editId}`, form)).data;
      return (await api.post(`/patients/${patientId}/notes`, form)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes', patientId] });
      setForm(EMPTY);
      setEditId(null);
      setError('');
    },
    onError: (e: any) =>
      setError(e.response?.data?.message ?? 'No se pudo guardar'),
  });

  const isLocked = (n: ClinicalNote) => new Date() > new Date(n.lockedAt);

  const startEdit = (n: ClinicalNote) => {
    setEditId(n.id);
    setForm({
      subjective: n.subjective,
      objective: n.objective,
      evaluation: n.evaluation,
      plan: n.plan,
    });
  };

  return (
    <div className="space-y-6">
      {canCreate && (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        className="rounded-card border border-border bg-white p-5 space-y-3"
      >
        <h3 className="font-semibold text-text">
          {editId ? 'Editar nota' : 'Nueva nota de evolución (SOEP)'}
        </h3>
        {(
          [
            ['subjective', 'Subjetivo (S)'],
            ['objective', 'Objetivo (O)'],
            ['evaluation', 'Evaluación (E)'],
            ['plan', 'Plan (P)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-sm font-medium text-text">
              {label}
            </span>
            <textarea
              required
              rows={2}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full rounded-lg border border-border-muted px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={mut.isPending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-active disabled:opacity-60"
          >
            {editId ? 'Guardar cambios' : 'Firmar y guardar'}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => {
                setEditId(null);
                setForm(EMPTY);
              }}
              className="rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-text"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
      )}

      <div className="space-y-3">
        {notes.length === 0 && (
          <p className="text-sm text-text-muted">Sin notas de evolución.</p>
        )}
        {notes.map((n) => {
          const locked = isLocked(n);
          return (
            <div
              key={n.id}
              className="rounded-card border border-border bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs text-text-muted">
                  {new Date(n.createdAt).toLocaleString('es-EC')} ·{' '}
                  {n.author.fullName}
                </div>
                {locked ? (
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-text-muted">
                    🔒 Bloqueada (inmutable)
                  </span>
                ) : (
                  canCreate && (
                    <button
                      onClick={() => startEdit(n)}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Editar
                    </button>
                  )
                )}
              </div>
              <dl className="grid gap-1 text-sm sm:grid-cols-2">
                <Item label="S" value={n.subjective} />
                <Item label="O" value={n.objective} />
                <Item label="E" value={n.evaluation} />
                <Item label="P" value={n.plan} />
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-semibold text-text-muted">{label}:</span>{' '}
      <span className="text-text">{value}</span>
    </div>
  );
}
