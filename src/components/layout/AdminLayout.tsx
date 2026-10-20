// Estructura del panel administrativo con navegación lateral (o superior en móvil).
import { NavLink, Outlet } from 'react-router';
import {
  BarChart3, Boxes, ClipboardList, Cog, FileClock, Factory, Package, ScrollText, ShoppingBag, Store, Tags, Truck, Users,
} from 'lucide-react';
import { Logo } from './Logo';
import { OfflineBanner } from '../ui/Feedback';
import { useAuth } from '../../context/AuthContext';

const ITEMS = [
  { to: '/admin', label: 'Resumen', icon: BarChart3, end: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { to: '/admin/mostrador', label: 'Venta en mostrador', icon: Store },
  { to: '/admin/produccion', label: 'Producción', icon: Factory },
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/categorias', label: 'Categorías', icon: Tags },
  { to: '/admin/inventario', label: 'Inventario', icon: Boxes },
  { to: '/admin/recetas', label: 'Recetas', icon: ScrollText },
  { to: '/admin/proveedores', label: 'Proveedores', icon: Truck },
  { to: '/admin/usuarios', label: 'Usuarios y roles', icon: Users },
  { to: '/admin/configuracion', label: 'Configuración', icon: Cog },
  { to: '/admin/auditoria', label: 'Auditoría', icon: FileClock },
];

export function AdminLayout() {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen bg-ink-50">
      <OfflineBanner />
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-ink-100 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-4 py-3">
            <Logo />
          </div>
          <p className="hidden px-4 text-xs font-bold uppercase tracking-wider text-ink-400 lg:block">Administración</p>
          <nav aria-label="Administración" className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${isActive ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-ink-100'}`}>
                <Icon className="h-4 w-4" aria-hidden />{label}
              </NavLink>
            ))}
            <NavLink to="/empleado/tareas" className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-ink-700 hover:bg-ink-100">
              <ClipboardList className="h-4 w-4" aria-hidden />Mis tareas
            </NavLink>
            <NavLink to="/" className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-ink-500 hover:bg-ink-100">
              ← Ir a la tienda
            </NavLink>
          </nav>
          <p className="hidden px-4 py-4 text-xs text-ink-500 lg:block">Sesión: {profile?.full_name || profile?.email}</p>
        </aside>
        <main id="contenido" className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
