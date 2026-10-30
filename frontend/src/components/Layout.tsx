import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

const NAV = [
  { to: '/', label: 'Inicio', icon: 'dashboard', end: true },
  { to: '/pacientes', label: 'Pacientes', icon: 'clinical_notes' },
  { to: '/agenda', label: 'Agenda', icon: 'calendar_clock' },
  { to: '/facturacion', label: 'Facturación', icon: 'receipt_long' },
  { to: '/caja', label: 'Caja', icon: 'point_of_sale' },
  { to: '/inventario', label: 'Inventario', icon: 'inventory_2' },
  { to: '/reportes', label: 'Reportes', icon: 'bar_chart' },
  { to: '/seguridad', label: 'Seguridad', icon: 'shield_person' },
];

// Minutos de inactividad antes del cierre automático (RNF-05).
const IDLE_MINUTES = 15;

function Icon({ name, className = 'text-[20px]' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const timer = useRef<number | undefined>(undefined);
  // Sidebar como panel deslizante en móvil (cerrado por defecto).
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Cierra el panel móvil al navegar a otra sección.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentLabel = NAV.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
  )?.label ?? 'Panel de gestión';

  const initials = (user?.fullName ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-screen bg-canvas">
      {/* Fondo oscuro detrás del panel móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: panel fijo en desktop, deslizante en móvil */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col justify-between bg-white shadow-[0_1px_8px_rgba(15,23,42,0.04)] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          <div className="flex h-16 items-center justify-between gap-2.5 border-b border-border px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
                <Icon name="dentistry" className="text-[20px]" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-headline text-[17px] font-bold text-brand">SIGO-Dental</span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                  Gestión clínica
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted lg:hidden"
              aria-label="Cerrar menú"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>

          <nav className="flex flex-col gap-1 p-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-container font-semibold text-brand-on-container shadow-card'
                      : 'text-text-muted hover:bg-surface-muted hover:text-text'
                  }`
                }
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="m-3 rounded-lg bg-surface-muted p-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-brand">
            <Icon name="verified_user" className="text-[16px]" />
            <span className="text-[11px] font-bold uppercase tracking-wide">Autor del sistema</span>
          </div>
          <p className="text-xs leading-snug text-text-muted">Luis Anchundia</p>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-white/90 px-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-surface-muted lg:hidden"
              aria-label="Abrir menú"
            >
              <Icon name="menu" className="text-[22px]" />
            </button>
            <div className="hidden min-w-0 items-center gap-2 text-sm text-text-muted sm:flex">
              <span className="shrink-0 font-semibold text-brand">SIGO-Dental</span>
              <Icon name="chevron_right" className="text-[16px]" />
              <span className="truncate text-text">{currentLabel}</span>
            </div>
            <span className="truncate text-sm font-semibold text-text sm:hidden">
              {currentLabel}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-container text-xs font-bold text-brand-on-container">
                {initials}
              </div>
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-semibold text-text">{user?.fullName}</p>
                <p className="text-xs text-text-muted">{user?.role}</p>
              </div>
            </div>
            <div className="hidden h-6 w-px bg-border sm:block" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-critical transition-colors hover:bg-critical-bg sm:px-3"
              aria-label="Salir"
            >
              <Icon name="logout" className="text-[18px]" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-canvas p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
