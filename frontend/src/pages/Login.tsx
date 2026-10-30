import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { AuthUser } from '@/types';

// Usuarios de prueba precargados (seed). Misma contraseña para todos.
const DEMO_PASSWORD = 'Admin123*';
const DEMO_USERS = [
  { email: 'admin@sigodental.com', label: 'Admin TI' },
  { email: 'odontologo@sigodental.com', label: 'Odontóloga — Dra. Mera' },
  { email: 'odontologo2@sigodental.com', label: 'Odontólogo — Dr. Villacrés' },
  { email: 'recepcion@sigodental.com', label: 'Recepción' },
  { email: 'asistente@sigodental.com', label: 'Asistente' },
  { email: 'auditor@sigodental.com', label: 'Auditor' },
];

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

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted p-4">
      <div className="flex w-full max-w-3xl flex-col gap-4 md:flex-row md:items-start">
      <div className="w-full max-w-sm rounded-card bg-white p-8 shadow-card mx-auto md:mx-0">
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
          Contraseña de todos los usuarios de prueba: {DEMO_PASSWORD}
        </p>
      </div>

      {/* Panel de usuarios de prueba (seed) — clic para autocompletar */}
      <div className="w-full max-w-xs rounded-card bg-white p-5 shadow-card mx-auto md:mx-0">
        <h2 className="mb-1 text-sm font-semibold text-text">
          Usuarios de prueba
        </h2>
        <p className="mb-3 text-xs text-text-muted">
          Clic para autocompletar el formulario.
        </p>
        <div className="space-y-1.5">
          {DEMO_USERS.map((u) => (
            <button
              key={u.email}
              type="button"
              onClick={() => fillDemo(u.email)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                email === u.email
                  ? 'border-brand bg-brand-container text-brand-on-container'
                  : 'border-border-muted text-text hover:bg-surface-muted'
              }`}
            >
              <div className="font-semibold">{u.label}</div>
              <div className="text-text-muted">{u.email}</div>
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
