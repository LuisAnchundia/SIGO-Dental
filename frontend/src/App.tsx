import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { canAccess } from '@/lib/permissions';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Patients } from '@/pages/Patients';
import { PatientDetail } from '@/pages/PatientDetail';
import { Agenda } from '@/pages/Agenda';
import { Facturacion } from '@/pages/Facturacion';
import { Caja } from '@/pages/Caja';
import { Inventario } from '@/pages/Inventario';
import { Reportes } from '@/pages/Reportes';
import { Seguridad } from '@/pages/Seguridad';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// RBAC en el cliente: espejo de los @Roles() del backend. Si el rol no
// tiene acceso a la sección (ej. acceso directo por URL), redirige al
// inicio en vez de dejar ver una pantalla que el backend igual rechazará.
function RoleRoute({ path, children }: { path: string; children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();
  if (!canAccess(path, role)) {
    return <Navigate to="/" replace state={{ deniedFrom: location.pathname }} />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pacientes" element={<Patients />} />
        <Route path="pacientes/:id" element={<PatientDetail />} />
        <Route
          path="agenda"
          element={
            <RoleRoute path="/agenda">
              <Agenda />
            </RoleRoute>
          }
        />
        <Route
          path="facturacion"
          element={
            <RoleRoute path="/facturacion">
              <Facturacion />
            </RoleRoute>
          }
        />
        <Route
          path="caja"
          element={
            <RoleRoute path="/caja">
              <Caja />
            </RoleRoute>
          }
        />
        <Route
          path="inventario"
          element={
            <RoleRoute path="/inventario">
              <Inventario />
            </RoleRoute>
          }
        />
        <Route
          path="reportes"
          element={
            <RoleRoute path="/reportes">
              <Reportes />
            </RoleRoute>
          }
        />
        <Route path="seguridad" element={<Seguridad />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
