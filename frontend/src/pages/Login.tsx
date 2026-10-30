import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { AuthUser } from '@/types';

export function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('admin@sigodental.com');
  const [password, setPassword] = useState('Admin123*');
  const [otp, setOtp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post<{ accessToken: string; user: AuthUser }>(
        '/auth/login',
        { email, password, otp: otp || undefined },
      );
      setSession(data.accessToken, data.user);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg === 'MFA_REQUIRED') {
        setMfaRequired(true);
        setError('Ingrese el código de su app de autenticación');
      } else {
        setError(msg === 'Código MFA inválido' ? msg : 'Credenciales inválidas');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted p-4">
      <div className="w-full max-w-sm rounded-card bg-white p-8 shadow-card">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-text">SIGO-Dental</h1>
          <p className="text-sm text-text-muted">Acceso al sistema</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border-muted px-3 py-2 text-sm focus:border-brand focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border-muted px-3 py-2 text-sm focus:border-brand focus:outline-none"
              required
            />
          </div>
          {mfaRequired && (
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Código MFA (6 dígitos)
              </label>
              <input
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-lg border border-border-muted px-3 py-2 text-sm tracking-widest focus:border-brand focus:outline-none"
                placeholder="000000"
                autoFocus
              />
            </div>
          )}
          {error && (
            <p
              className={`text-sm ${mfaRequired ? 'text-text-muted' : 'text-red-600'}`}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-active disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-text-muted">
          Demo: admin@sigodental.com / Admin123*
        </p>
      </div>
    </div>
  );
}
