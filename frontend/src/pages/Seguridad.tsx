import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function Seguridad() {
  const { user, token, setSession } = useAuthStore();
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [enabled, setEnabled] = useState(!!user?.mfaEnabled);
  const [msg, setMsg] = useState('');

  const setupMfa = async () => {
    setMsg('');
    const { data } = await api.post<{ qr: string }>('/auth/mfa/setup');
    setQr(data.qr);
  };

  const verify = async () => {
    setMsg('');
    try {
      await api.post('/auth/mfa/verify', { code });
      setEnabled(true);
      setQr('');
      setCode('');
      if (user && token) setSession(token, { ...user, mfaEnabled: true });
      setMsg('MFA activado correctamente.');
    } catch (e: any) {
      setMsg(e.response?.data?.message ?? 'Código inválido');
    }
  };

  const disable = async () => {
    await api.post('/auth/mfa/disable');
    setEnabled(false);
    if (user && token) setSession(token, { ...user, mfaEnabled: false });
    setMsg('MFA desactivado.');
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Seguridad</h2>

      <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">
              Autenticación de dos factores (MFA)
            </h3>
            <p className="text-sm text-slate-500">
              Requerida para expedientes clínicos e información financiera (RNF-05).
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              enabled
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {enabled ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {!enabled && !qr && (
          <button
            onClick={setupMfa}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Activar MFA
          </button>
        )}

        {qr && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Escanee el código con Google Authenticator o similar, e ingrese el
              código de 6 dígitos.
            </p>
            <img
              src={qr}
              alt="Código QR MFA"
              className="h-44 w-44 rounded-lg border border-slate-200"
            />
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-widest"
              />
              <button
                onClick={verify}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Verificar
              </button>
            </div>
          </div>
        )}

        {enabled && (
          <button
            onClick={disable}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Desactivar MFA
          </button>
        )}

        {msg && <p className="text-sm text-teal-700">{msg}</p>}
      </div>
    </div>
  );
}
