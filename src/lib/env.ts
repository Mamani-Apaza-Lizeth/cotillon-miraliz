// Lectura y validación de variables de entorno PÚBLICAS (prefijo VITE_).
// Ninguna clave secreta debe llegar aquí: todo lo que se lee con import.meta.env
// queda incluido en el JavaScript que descarga el navegador.

export interface PublicEnv {
  supabaseUrl: string;
  supabaseKey: string;
  stripePublishableKey: string | null;
  siteUrl: string;
}

const FORBIDDEN_KEY_PATTERNS = [/^sb_secret_/, /^sk_(test|live)_/, /^whsec_/, /service_role/];

/** Detecta si un JWT legacy de Supabase corresponde al rol service_role. */
function isServiceRoleJwt(key: string): boolean {
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

export function readPublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const supabaseUrl = (source.VITE_SUPABASE_URL ?? '').trim();
  const supabaseKey = (source.VITE_SUPABASE_PUBLISHABLE_KEY ?? source.VITE_SUPABASE_ANON_KEY ?? '').trim();
  const stripe = (source.VITE_STRIPE_PUBLISHABLE_KEY ?? '').trim();

  const problems: string[] = [];
  if (!/^https?:\/\/.+/.test(supabaseUrl) || supabaseUrl.includes('<')) {
    problems.push('VITE_SUPABASE_URL no está configurada o tiene el valor de ejemplo.');
  }
  if (!supabaseKey || supabaseKey.includes('<')) {
    problems.push('VITE_SUPABASE_PUBLISHABLE_KEY no está configurada o tiene el valor de ejemplo.');
  }
  if (FORBIDDEN_KEY_PATTERNS.some((r) => r.test(supabaseKey)) || isServiceRoleJwt(supabaseKey)) {
    problems.push('Se detectó una clave SECRETA en VITE_SUPABASE_PUBLISHABLE_KEY. Use la clave pública (publishable/anon).');
  }
  if (stripe && !/^pk_(test|live)_/.test(stripe)) {
    problems.push('VITE_STRIPE_PUBLISHABLE_KEY debe empezar con pk_test_ o pk_live_ (nunca sk_).');
  }
  if (problems.length > 0) {
    throw new EnvError(problems);
  }
  return {
    supabaseUrl,
    supabaseKey,
    stripePublishableKey: stripe || null,
    siteUrl: (source.VITE_SITE_URL ?? '').trim() || (typeof window !== 'undefined' ? window.location.origin : ''),
  };
}

export class EnvError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(problems.join(' '));
    this.name = 'EnvError';
    this.problems = problems;
  }
}
