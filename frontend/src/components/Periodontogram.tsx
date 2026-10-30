import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FDI_PERMANENT_LOWER, FDI_PERMANENT_UPPER } from '@/lib/teeth';
import type { PerioMeasurement, PerioSite, PerioTooth } from '@/types';

const SITES: PerioSite[] = ['MV', 'V', 'DV', 'MP', 'P', 'DP'];
const ALL_TEETH = [...FDI_PERMANENT_UPPER, ...FDI_PERMANENT_LOWER];

type SiteState = Record<
  string,
  { pd: number; margin: number; bleeding: boolean }
>; // key: tooth|site
type ToothState = Record<string, { mobility: number; furcation: number }>;

export function Periodontogram({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [sites, setSites] = useState<SiteState>({});
  const [teeth, setTeeth] = useState<ToothState>({});

  const { data } = useQuery({
    queryKey: ['periodontogram', patientId],
    queryFn: async () =>
      (
        await api.get<{ measurements: PerioMeasurement[]; teeth: PerioTooth[] }>(
          `/patients/${patientId}/periodontogram`,
        )
      ).data,
  });

  // Sincroniza el estado editable con los datos del servidor.
  useEffect(() => {
    if (!data) return;
    const s: SiteState = {};
    for (const m of data.measurements) {
      s[`${m.toothNumber}|${m.site}`] = {
        pd: m.probingDepth,
        margin: m.gingivalMargin,
        bleeding: m.bleeding,
      };
    }
    setSites(s);
    const t: ToothState = {};
    for (const pt of data.teeth) {
      t[pt.toothNumber] = { mobility: pt.mobility, furcation: pt.furcation };
    }
    setTeeth(t);
  }, [data]);

  const saveSite = (
    tooth: string,
    site: PerioSite,
    pd: number,
    margin: number,
    bleeding: boolean,
  ) => {
    setSites((prev) => ({
      ...prev,
      [`${tooth}|${site}`]: { pd, margin, bleeding },
    }));
    api
      .put(`/patients/${patientId}/periodontogram/measurement`, {
        toothNumber: tooth,
        site,
        probingDepth: pd,
        gingivalMargin: margin,
        bleeding,
      })
      .then(() =>
        qc.invalidateQueries({ queryKey: ['periodontogram', patientId] }),
      );
  };

  const saveTooth = (tooth: string, mobility: number, furcation: number) => {
    setTeeth((prev) => ({ ...prev, [tooth]: { mobility, furcation } }));
    api
      .put(`/patients/${patientId}/periodontogram/tooth`, {
        toothNumber: tooth,
        mobility,
        furcation,
      })
      .then(() =>
        qc.invalidateQueries({ queryKey: ['periodontogram', patientId] }),
      );
  };

  return (
    <div>
      <p className="mb-3 text-sm text-text-muted">
        Por cada sitio: profundidad al sondaje <strong>PS</strong> (mm) y margen
        gingival <strong>MG</strong> (negativo = recesión). El <strong>NIC</strong>
        (nivel de inserción clínica = PS − MG) se calcula solo. Más movilidad,
        furca y sangrado (punto rojo) — RF-04.
      </p>
      <div className="overflow-x-auto rounded-card border border-border bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-canvas text-text-muted">
            <tr>
              <th className="px-2 py-2 text-left">Diente</th>
              {SITES.map((s) => (
                <th key={s} className="px-2 py-2 text-center">
                  {s}
                </th>
              ))}
              <th className="px-2 py-2 text-center">Movil.</th>
              <th className="px-2 py-2 text-center">Furca</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ALL_TEETH.map((tooth) => {
              const tState = teeth[tooth] ?? { mobility: 0, furcation: 0 };
              return (
                <tr key={tooth}>
                  <td className="px-2 py-1 font-semibold text-text">
                    {tooth}
                  </td>
                  {SITES.map((site) => {
                    const st = sites[`${tooth}|${site}`] ?? {
                      pd: 0,
                      margin: 0,
                      bleeding: false,
                    };
                    const nic = st.pd - st.margin;
                    return (
                      <td key={site} className="px-1 py-1 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <input
                            type="number"
                            min={0}
                            max={15}
                            title="Profundidad al sondaje (mm)"
                            value={st.pd || ''}
                            onChange={(e) =>
                              saveSite(
                                tooth,
                                site,
                                Number(e.target.value || 0),
                                st.margin,
                                st.bleeding,
                              )
                            }
                            className={`w-10 rounded border px-1 py-0.5 text-center ${
                              st.bleeding
                                ? 'border-red-400 bg-red-50 text-red-700'
                                : 'border-border-muted'
                            }`}
                          />
                          <input
                            type="number"
                            min={-10}
                            max={10}
                            title="Margen gingival (mm)"
                            value={st.margin || ''}
                            onChange={(e) =>
                              saveSite(
                                tooth,
                                site,
                                st.pd,
                                Number(e.target.value || 0),
                                st.bleeding,
                              )
                            }
                            className="w-10 rounded border border-border px-1 py-0.5 text-center text-text-muted"
                          />
                          <span className="text-[10px] font-semibold text-text-muted">
                            NIC {nic}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              saveSite(tooth, site, st.pd, st.margin, !st.bleeding)
                            }
                            title="Sangrado al sondaje"
                            className={`h-2.5 w-2.5 rounded-full ${
                              st.bleeding ? 'bg-red-500' : 'bg-slate-200'
                            }`}
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-1 py-1 text-center">
                    <select
                      value={tState.mobility}
                      onChange={(e) =>
                        saveTooth(tooth, Number(e.target.value), tState.furcation)
                      }
                      className="rounded border border-border-muted px-1 py-0.5"
                    >
                      {[0, 1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1 text-center">
                    <select
                      value={tState.furcation}
                      onChange={(e) =>
                        saveTooth(tooth, tState.mobility, Number(e.target.value))
                      }
                      className="rounded border border-border-muted px-1 py-0.5"
                    >
                      {[0, 1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
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
