// Protege rutas de la INTERFAZ según sesión y rol. Es una comodidad de navegación:
// la seguridad real está en RLS y en las funciones de la base de datos.
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Feedback';
import { ButtonLink } from '../ui/Button';
import type { AppRole } from '../../types/db';

export function ProtectedRoute({ roles, children }: { roles?: AppRole[]; children: ReactNode }) {
  const { session, role, loading, profile } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Verificando sesión…" />;
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/ingresar?next=${next}`} replace />;
  }
  if (session && !profile) return <Spinner label="Cargando su cuenta…" />;
  if (!role) {
    return <Denied message="Su cuenta está desactivada. Comuníquese con la tienda." />;
  }
  if (roles && !roles.includes(role)) {
    return <Denied message="No tiene permiso para ver esta sección." />;
  }
  return <>{children}</>;
}

function Denied({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <ShieldAlert className="mx-auto h-12 w-12 text-brand-500" aria-hidden />
      <h1 className="mt-4 text-3xl">Acceso restringido</h1>
      <p className="mt-2 text-ink-500">{message}</p>
      <ButtonLink to="/" className="mt-6">Volver al inicio</ButtonLink>
    </div>
  );
}
