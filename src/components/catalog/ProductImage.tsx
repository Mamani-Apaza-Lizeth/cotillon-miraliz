// Imagen de producto con ilustración de respaldo (globos) cuando aún no tiene fotos.
import { useState } from 'react';
import { productImageUrl } from '../../lib/storage';

const PALETTES = [
  ['var(--color-brand-400)', 'var(--color-sun-400)', 'var(--color-mint-300)'],
  ['var(--color-grape-300)', 'var(--color-brand-300)', 'var(--color-sun-300)'],
  ['var(--color-mint-300)', 'var(--color-grape-300)', 'var(--color-brand-300)'],
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ProductImage({ path, alt, seed, className = '' }: { path?: string | null; alt: string; seed: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = productImageUrl(path);
  if (url && !failed) {
    return <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`h-full w-full object-cover ${className}`} />;
  }
  const [a, b, c] = PALETTES[hash(seed) % PALETTES.length];
  return (
    <div className={`confetti-bg grid h-full w-full place-items-center bg-cream ${className}`} role="img" aria-label={`${alt} (sin fotografía)`}>
      <svg viewBox="0 0 120 100" className="h-3/5 w-3/5" aria-hidden>
        <ellipse cx="45" cy="38" rx="20" ry="24" fill={a} />
        <ellipse cx="75" cy="42" rx="18" ry="22" fill={b} />
        <ellipse cx="60" cy="30" rx="14" ry="17" fill={c} />
        <path d="M45 62 C50 75 58 80 60 95 M75 64 C70 76 63 82 60 95 M60 47 L60 95" stroke="var(--color-ink-400)" strokeWidth="1.5" fill="none" />
        <ellipse cx="38" cy="28" rx="4" ry="7" fill="#fff" opacity=".5" />
      </svg>
    </div>
  );
}
