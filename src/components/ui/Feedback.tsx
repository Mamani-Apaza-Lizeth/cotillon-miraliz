// Estados de carga, vacío, error, insignias y encabezados de página.
import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, PartyPopper, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './Button';
import { useOnline } from '../../hooks/useAsync';

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-ink-500" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-brand-500" aria-hidden />
      <span className="font-semibold">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card confetti-bg flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="rounded-full bg-sun-100 p-4 text-sun-700">{icon ?? <PartyPopper className="h-8 w-8" aria-hidden />}</div>
      <h3 className="text-xl">{title}</h3>
      {description && <p className="max-w-md text-ink-500">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-rose-200 bg-rose-50 px-6 py-10 text-center" role="alert">
      <AlertTriangle className="h-8 w-8 text-rose-600" aria-hidden />
      <p className="max-w-lg font-semibold text-rose-900">{message}</p>
      {onRetry && <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>Reintentar</Button>}
    </div>
  );
}

type Tone = 'gray' | 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'pink';
const TONES: Record<Tone, string> = {
  gray: 'bg-ink-100 text-ink-700',
  yellow: 'bg-sun-100 text-sun-700',
  blue: 'bg-sky-100 text-sky-800',
  purple: 'bg-grape-100 text-grape-700',
  green: 'bg-mint-100 text-mint-700',
  red: 'bg-rose-100 text-rose-700',
  pink: 'bg-brand-100 text-brand-700',
};

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-extrabold ${TONES[tone]}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'success' | 'danger'; children: ReactNode }) {
  const map = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900',
  };
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${map[tone]}`}>{children}</div>;
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-ink-900 px-4 py-2 text-sm font-bold text-white" role="status">
      <WifiOff className="h-4 w-4" aria-hidden /> Sin conexión. Los cambios no se guardarán hasta que vuelva la red.
    </div>
  );
}

export function StatCard({ label, value, hint, tone = 'pink' }: { label: string; value: ReactNode; hint?: string; tone?: Tone }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 font-display text-2xl ${tone === 'red' ? 'text-rose-600' : 'text-ink-900'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
