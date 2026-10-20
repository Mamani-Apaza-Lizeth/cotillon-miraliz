import { Link } from 'react-router';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2" aria-label="Cotillón MiraLiz, ir al inicio">
      <svg viewBox="0 0 64 64" className="h-10 w-10 transition group-hover:-rotate-6" aria-hidden>
        <ellipse cx="26" cy="24" rx="16" ry="19" fill="var(--color-brand-600)" />
        <ellipse cx="42" cy="28" rx="13" ry="16" fill="var(--color-sun-500)" />
        <path d="M26 43 L23 48 L29 48 Z" fill="var(--color-brand-600)" />
        <path d="M42 44 L39 49 L45 49 Z" fill="var(--color-sun-500)" />
        <path d="M26 48 C28 54 34 56 36 62 M42 49 C40 54 38 57 36 62" stroke="var(--color-ink-700)" strokeWidth="2" fill="none" />
        <ellipse cx="20" cy="17" rx="4" ry="6" fill="#fff" opacity=".45" />
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">Cotillón</span>
          <span className="block font-display text-2xl font-bold text-brand-600">MiraLiz</span>
        </span>
      )}
    </Link>
  );
}
