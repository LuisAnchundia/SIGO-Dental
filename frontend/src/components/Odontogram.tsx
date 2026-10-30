import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  rowsFor,
  toNotation,
  type DentitionKind,
  type Notation,
} from '@/lib/teeth';
import type { ToothCondition, ToothRecord, ToothSurface } from '@/types';

interface CondMeta {
  key: ToothCondition;
  label: string;
  color: string;
  whole: boolean;
}

// Catálogo visual estandarizado del documento (RF-03).
// Colores del sistema de diseño "Clinical Precision": cada condición usa el
// tono semántico fijo definido para patología/tratamiento dental.
const CONDITIONS: CondMeta[] = [
  { key: 'SANO', label: 'Sano (borrar)', color: '#ffffff', whole: false },
  { key: 'CARIES', label: 'Caries', color: '#dc2626', whole: false },
  { key: 'RESTAURACION', label: 'Restauración', color: '#2563eb', whole: false },
  { key: 'ENDODONCIA', label: 'Endodoncia', color: '#9333ea', whole: false },
  { key: 'SELLANTE', label: 'Sellante', color: '#0d9488', whole: false },
  { key: 'CORONA', label: 'Corona', color: '#d97706', whole: true },
  { key: 'PROTESIS_FIJA', label: 'Prót. fija', color: '#06b6d4', whole: true },
  { key: 'PROTESIS_REMOVIBLE', label: 'Prót. removible', color: '#67e8f9', whole: true },
  { key: 'IMPLANTE', label: 'Implante', color: '#334155', whole: true },
  { key: 'EXODONCIA', label: 'Exodoncia', color: '#0f172a', whole: true },
];

const COLOR: Record<ToothCondition, string> = Object.fromEntries(
  CONDITIONS.map((c) => [c.key, c.color]),
) as Record<ToothCondition, string>;

const META: Record<ToothCondition, CondMeta> = Object.fromEntries(
  CONDITIONS.map((c) => [c.key, c]),
) as Record<ToothCondition, CondMeta>;

// Posición de cada superficie en la caja 3x3 del diente.
const CELL: (ToothSurface | null)[] = [
  null, 'VESTIBULAR', null,
  'MESIAL', 'OCLUSAL', 'DISTAL',
  null, 'LINGUAL', null,
];

function Tooth({
  label,
  surfaces,
  general,
  onApply,
}: {
  label: string;
  surfaces: Record<string, ToothCondition>;
  general?: ToothCondition;
  onApply: (surface: ToothSurface) => void;
}) {
  const generalColor = general ? COLOR[general] : undefined;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold text-text-muted">{label}</span>
      <div
        className="relative grid grid-cols-3 grid-rows-3 rounded-sm"
        style={{
          width: 34,
          height: 34,
          outline: generalColor ? `2px solid ${generalColor}` : undefined,
        }}
      >
        {CELL.map((surface, i) =>
          surface ? (
            <button
              key={i}
              onClick={() => onApply(surface)}
              title={surface}
              className="border border-border-muted hover:brightness-95"
              style={{
                backgroundColor: surfaces[surface]
                  ? COLOR[surfaces[surface]]
                  : '#ffffff',
              }}
            />
          ) : (
            <div key={i} />
          ),
        )}
        {general === 'EXODONCIA' && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-bold text-text">
            ✕
          </span>
        )}
        {general === 'IMPLANTE' && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold text-text">
            ⬡
          </span>
        )}
      </div>
    </div>
  );
}

export function Odontogram({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [notation, setNotation] = useState<Notation>('FDI');
  const [dentition, setDentition] = useState<DentitionKind>('PERMANENTE');
  const [tool, setTool] = useState<ToothCondition>('CARIES');

  const { data: records = [] } = useQuery({
    queryKey: ['odontogram', patientId],
    queryFn: async () =>
      (await api.get<ToothRecord[]>(`/patients/${patientId}/odontogram`)).data,
  });

  const mut = useMutation({
    mutationFn: async (body: {
      toothNumber: string;
      surface: ToothSurface;
      condition: ToothCondition;
    }) =>
      (
        await api.put(`/patients/${patientId}/odontogram`, {
          ...body,
          dentition,
        })
      ).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['odontogram', patientId] }),
  });

  // Índice: por diente -> superficies y condición general.
  const { bySurface, general } = useMemo(() => {
    const bySurface: Record<string, Record<string, ToothCondition>> = {};
    const general: Record<string, ToothCondition> = {};
    for (const r of records) {
      if (r.condition === 'SANO') continue;
      if (r.surface === 'GENERAL') general[r.toothNumber] = r.condition;
      else {
        bySurface[r.toothNumber] ??= {};
        bySurface[r.toothNumber][r.surface] = r.condition;
      }
    }
    return { bySurface, general };
  }, [records]);

  const { upper, lower } = rowsFor(dentition);

  const apply = (toothNumber: string, surface: ToothSurface) => {
    const whole = META[tool].whole;
    mut.mutate({
      toothNumber,
      surface: whole ? 'GENERAL' : surface,
      condition: tool,
    });
  };

  const renderRow = (teeth: string[]) => (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {teeth.map((fdi, idx) => (
        <div key={fdi} className="flex">
          <Tooth
            label={toNotation(fdi, notation)}
            surfaces={bySurface[fdi] ?? {}}
            general={general[fdi]}
            onApply={(s) => apply(fdi, s)}
          />
          {idx === teeth.length / 2 - 1 && <div className="w-3" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Toggle
          value={notation}
          options={[
            ['FDI', 'FDI'],
            ['UNIVERSAL', 'Universal'],
          ]}
          onChange={(v) => setNotation(v as Notation)}
        />
        <Toggle
          value={dentition}
          options={[
            ['PERMANENTE', 'Permanente'],
            ['TEMPORAL', 'Temporal'],
          ]}
          onChange={(v) => setDentition(v as DentitionKind)}
        />
      </div>

      {/* Paleta de condiciones */}
      <div className="flex flex-wrap gap-2">
        {CONDITIONS.map((c) => (
          <button
            key={c.key}
            onClick={() => setTool(c.key)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
              tool === c.key
                ? 'border-brand bg-brand-container text-brand'
                : 'border-border text-text-muted hover:bg-canvas'
            }`}
          >
            <span
              className="inline-block h-3 w-3 rounded-sm border border-border-muted"
              style={{ backgroundColor: c.color }}
            />
            {c.label}
          </button>
        ))}
      </div>

      <div className="rounded-card border border-border bg-white p-4 space-y-3">
        {renderRow(upper)}
        <div className="border-t border-dashed border-border" />
        {renderRow(lower)}
      </div>

      <p className="text-xs text-text-muted">
        Herramienta activa: <strong>{META[tool].label}</strong>. Clic en una
        superficie para marcarla. Las condiciones de todo el diente (corona,
        prótesis, implante, exodoncia) se aplican al diente completo.
      </p>
    </div>
  );
}

function Toggle({
  value,
  options,
  onChange,
}: {
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {options.map(([val, label]) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`rounded-md px-3 py-1 text-xs font-medium ${
            value === val ? 'bg-slate-900 text-white' : 'text-text-muted'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
