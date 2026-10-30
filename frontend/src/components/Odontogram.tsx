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
const CONDITIONS: CondMeta[] = [
  { key: 'SANO', label: 'Sano (borrar)', color: '#ffffff', whole: false },
  { key: 'CARIES', label: 'Caries', color: '#ef4444', whole: false },
  { key: 'RESTAURACION', label: 'Restauración', color: '#3b82f6', whole: false },
  { key: 'ENDODONCIA', label: 'Endodoncia', color: '#a855f7', whole: false },
  { key: 'SELLANTE', label: 'Sellante', color: '#22c55e', whole: false },
  { key: 'CORONA', label: 'Corona', color: '#f59e0b', whole: true },
  { key: 'PROTESIS_FIJA', label: 'Prót. fija', color: '#14b8a6', whole: true },
  { key: 'PROTESIS_REMOVIBLE', label: 'Prót. removible', color: '#06b6d4', whole: true },
  { key: 'IMPLANTE', label: 'Implante', color: '#64748b', whole: true },
  { key: 'EXODONCIA', label: 'Exodoncia', color: '#111827', whole: true },
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
      <span className="text-[10px] font-semibold text-slate-500">{label}</span>
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
              className="border border-slate-300 hover:brightness-95"
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
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-900">
            ✕
          </span>
        )}
        {general === 'IMPLANTE' && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
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
                ? 'border-teal-500 bg-teal-50 text-teal-800'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span
              className="inline-block h-3 w-3 rounded-sm border border-slate-300"
              style={{ backgroundColor: c.color }}
            />
            {c.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        {renderRow(upper)}
        <div className="border-t border-dashed border-slate-200" />
        {renderRow(lower)}
      </div>

      <p className="text-xs text-slate-400">
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
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
      {options.map(([val, label]) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`rounded-md px-3 py-1 text-xs font-medium ${
            value === val ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
