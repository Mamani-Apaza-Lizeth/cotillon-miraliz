// Utilidades compartidas por las Edge Functions (runtime Deno de Supabase).
// Las claves se leen de variables de entorno inyectadas por Supabase; nunca del cliente.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',').map((o) => o.trim()).filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allow = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Primer valor de un diccionario JSON de claves (formato SUPABASE_*_KEYS). */
function firstKeyFromJson(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  try {
    const dict = JSON.parse(raw) as Record<string, string>;
    return dict.default ?? Object.values(dict)[0];
  } catch {
    return undefined;
  }
}

function supabaseUrl(): string {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('SUPABASE_URL no está disponible en la función.');
  return url;
}

/** Cliente que actúa COMO EL USUARIO que llama (RLS y validaciones de RPC aplican). */
export function userClient(authorization: string): SupabaseClient {
  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? firstKeyFromJson('SUPABASE_PUBLISHABLE_KEYS');
  if (!key) throw new Error('No hay clave pública de Supabase disponible en la función.');
  return createClient(supabaseUrl(), key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente privilegiado (service_role / secret). Usar SOLO para operaciones de backend. */
export function adminClient(): SupabaseClient {
  const key = firstKeyFromJson('SUPABASE_SECRET_KEYS') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new Error('No hay clave secreta de Supabase disponible en la función.');
  return createClient(supabaseUrl(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Convierte bolivianos a centavos sin errores de coma flotante. */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}
