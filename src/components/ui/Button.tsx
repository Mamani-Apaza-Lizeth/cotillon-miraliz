import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'sun';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-[0_3px_0_0_var(--color-brand-800)] hover:bg-brand-700 active:translate-y-[2px] active:shadow-none',
  secondary: 'bg-white text-ink-900 border-2 border-ink-200 hover:border-brand-300 hover:bg-brand-50',
  ghost: 'bg-transparent text-ink-700 hover:bg-ink-100',
  danger: 'bg-rose-600 text-white shadow-[0_3px_0_0_#9f1239] hover:bg-rose-700 active:translate-y-[2px] active:shadow-none',
  sun: 'bg-sun-400 text-ink-900 shadow-[0_3px_0_0_var(--color-sun-700)] hover:bg-sun-300 active:translate-y-[2px] active:shadow-none',
};
const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-2xl',
  lg: 'px-6 py-3 text-base rounded-2xl',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return `inline-flex items-center justify-center gap-2 font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading = false, icon, className = '', children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, String(className))} {...rest} />;
}
