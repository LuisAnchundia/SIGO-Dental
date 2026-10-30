import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Attachment } from '@/types';

const CATEGORIES = ['RADIOGRAFIA', 'FOTO', 'PDF', 'GENERAL'];

function human(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function Attachments({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState('RADIOGRAFIA');

  const { data: files = [] } = useQuery({
    queryKey: ['attachments', patientId],
    queryFn: async () =>
      (await api.get<Attachment[]>(`/patients/${patientId}/attachments`)).data,
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return (
        await api.post(`/patients/${patientId}/attachments`, fd, {
          params: { category },
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', patientId] });
      if (fileRef.current) fileRef.current.value = '';
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/attachments/${id}`)).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['attachments', patientId] }),
  });

  // Descarga con el token (no se puede usar un <a href> directo).
  const download = async (att: Attachment) => {
    const res = await api.get(`/attachments/${att.id}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.originalName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-white p-5">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border-muted px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMut.mutate(f);
          }}
          className="text-sm"
        />
        {uploadMut.isPending && (
          <span className="text-sm text-text-muted">Subiendo…</span>
        )}
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Archivo</th>
              <th className="px-4 py-2 font-medium">Categoría</th>
              <th className="px-4 py-2 font-medium">Tamaño</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {files.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  Sin archivos
                </td>
              </tr>
            ) : (
              files.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2 font-medium text-text">
                    {f.originalName}
                  </td>
                  <td className="px-4 py-2 text-text-muted">{f.category}</td>
                  <td className="px-4 py-2 text-text-muted">{human(f.size)}</td>
                  <td className="px-4 py-2 text-text-muted">
                    {new Date(f.createdAt).toLocaleDateString('es-EC')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => download(f)}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Descargar
                    </button>
                    <button
                      onClick={() => delMut.mutate(f.id)}
                      className="ml-3 text-xs font-semibold text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
