// Estructura de la tienda: cabecera con navegación por rol, contenido y pie de página.
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { ClipboardList, LayoutDashboard, LogIn, LogOut, Menu, Phone, ShoppingCart, User, X } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { OfflineBanner } from '../ui/Feedback';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl px-3 py-2 text-sm font-bold transition ${isActive ? 'bg-brand-100 text-brand-700' : 'text-ink-700 hover:bg-ink-100'}`;

export function PublicLayout() {
  const { session, role, profile, signOut } = useAuth();
  const { count } = useCart();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const close = () => setOpen(false);
  const handleSignOut = async () => {
    close();
    await signOut();
    navigate('/');
  };

  const nav = (
    <>
      <NavLink to="/" end className={linkClass} onClick={close}>Inicio</NavLink>
      <NavLink to="/catalogo" className={linkClass} onClick={close}>Catálogo</NavLink>
      <NavLink to="/catalogo?tipo=personalizado" className={linkClass} onClick={close}>Personalizados</NavLink>
      {session && role === 'cliente' && <NavLink to="/mis-pedidos" className={linkClass} onClick={close}>Mis pedidos</NavLink>}
      {(role === 'empleado' || role === 'admin') && (
        <NavLink to="/empleado/tareas" className={linkClass} onClick={close}>
          <span className="inline-flex items-center gap-1"><ClipboardList className="h-4 w-4" aria-hidden />Tareas</span>
        </NavLink>
      )}
      {role === 'admin' && (
        <NavLink to="/admin" className={linkClass} onClick={close}>
          <span className="inline-flex items-center gap-1"><LayoutDashboard className="h-4 w-4" aria-hidden />Administración</span>
        </NavLink>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <OfflineBanner />
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Principal">{nav}</nav>
          <div className="ml-auto flex items-center gap-1">
            {session && (
              <Link to="/carrito" className="relative rounded-xl p-2 text-ink-700 hover:bg-ink-100" aria-label={`Carrito, ${count} artículos`}>
                <ShoppingCart className="h-6 w-6" />
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-extrabold text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            )}
            {session ? (
              <div className="hidden items-center gap-1 sm:flex">
                <Link to="/perfil" className="flex items-center gap-1 rounded-xl px-2 py-2 text-sm font-bold text-ink-700 hover:bg-ink-100">
                  <User className="h-5 w-5" aria-hidden />
                  <span className="max-w-32 truncate">{profile?.full_name || 'Mi cuenta'}</span>
                </Link>
                <button type="button" onClick={handleSignOut} className="rounded-xl p-2 text-ink-700 hover:bg-ink-100" aria-label="Cerrar sesión" title="Cerrar sesión">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link to="/ingresar" className="hidden items-center gap-1 rounded-xl bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700 sm:inline-flex">
                <LogIn className="h-4 w-4" aria-hidden />Ingresar
              </Link>
            )}
            <button type="button" className="rounded-xl p-2 text-ink-700 hover:bg-ink-100 lg:hidden" onClick={() => setOpen((v) => !v)}
              aria-expanded={open} aria-controls="menu-movil" aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="menu-movil" className="flex flex-col gap-1 border-t border-ink-100 bg-white px-4 py-3 lg:hidden" aria-label="Menú móvil">
            {nav}
            {session ? (
              <>
                <NavLink to="/perfil" className={linkClass} onClick={close}>Mi perfil</NavLink>
                <button type="button" onClick={handleSignOut} className="rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-700 hover:bg-rose-50">Cerrar sesión</button>
              </>
            ) : (
              <NavLink to="/ingresar" className={linkClass} onClick={close}>Ingresar / Registrarse</NavLink>
            )}
          </nav>
        )}
      </header>

      <main id="contenido" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-ink-100 bg-ink-900 text-ink-100">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="font-display text-2xl text-white">{settings?.business.name ?? 'Cotillón MiraLiz'}</p>
            <p className="mt-2 text-sm text-ink-200">Artículos de fiesta, mochilas personalizadas, piñatas 2D y globos con serigrafía.</p>
          </div>
          <div>
            <p className="font-bold text-white">Contacto</p>
            <ul className="mt-2 space-y-1 text-sm">
              {(settings?.business.phones ?? ['67139111', '78855776']).map((p) => (
                <li key={p}><a className="inline-flex items-center gap-2 hover:text-sun-300" href={`tel:+591${p}`}><Phone className="h-4 w-4" aria-hidden />{p}</a></li>
              ))}
            </ul>
          </div>
<div>
  <p className="font-bold text-white">Ubicación</p>
  <p className="mt-2 text-sm text-ink-200">
    ZONA ACHACHICALA, AV. CHACALTAYA 1258, UNIVERSIDAD SALESIANA, La Paz
  </p>
</div>
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs text-ink-400">© {new Date().getFullYear()} Cotillón MiraLiz · La Paz, Bolivia</p>
      </footer>
    </div>
  );
}
