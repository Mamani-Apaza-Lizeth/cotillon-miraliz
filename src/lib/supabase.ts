// Cliente único de Supabase para toda la aplicación.
// Usa solo la clave PÚBLICA; los permisos reales los imponen RLS y las funciones RPC.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { EnvError, readPublicEnv, type PublicEnv } from './env';

let env: PublicEnv | null = null;
let envError: EnvError | null = null;

try {
  env = readPublicEnv(import.meta.env as Record<string, string | undefined>);
} catch (error) {
  envError = error instanceof EnvError ? error : new EnvError([String(error)]);
}

/** Problemas de configuración detectados al iniciar (se muestran en pantalla). */
export const configurationError = envError;
export const publicEnv = env;

export const supabase: SupabaseClient = createClient(
  env?.supabaseUrl ?? 'http://configuracion-pendiente.invalid',
  env?.supabaseKey ?? 'configuracion-pendiente',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
);

export const PRODUCT_BUCKET = 'product-images';
export const CUSTOMIZATION_BUCKET = 'customizations';
