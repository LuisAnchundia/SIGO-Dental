import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/pacientes', label: 'Pacientes' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/facturacion', label: 'Facturación' },
  { to: '/caja', label: 'Caja' },
  { to: '/inventario', label: 'Inventario' },
  { to: '/reportes', label: 'Reportes' },
];

// Minutos de inactividad antes del cierre automático (RNF-05).
const IDLE_MINUTES = 15;

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const timer = useRef<number | undefined>(undefined);

  // Cierre de sesión por inactividad (RNF-05).
  useEffect(() => {
    const reset = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(
        () => {
          logout();
          navigate('/login');
        },
        IDLE_MINUTES * 60 * 1000,
      );
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      window.clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen">
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700">
          <h1 className="text-lg font-bold tracking-tight">SIGO-Dental</h1>
          <p className="text-xs text-slate-400">Gestión odontológica</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-700 text-xs text-slate-400">
          Autor: Luis Anchundia
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">
                {user?.fullName}
              </p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Salir
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
