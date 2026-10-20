// Traducción de errores técnicos (Supabase/PostgREST/PostgreSQL/red) a mensajes comprensibles.

export interface AppError {
  message: string;
  /** Pista estructurada enviada por la base de datos (p. ej. 'fecha_no_viable'). */
  hint?: string;
  /** Detalle estructurado (p. ej. fecha sugerida en formato ISO). */
  detail?: string;
  code?: string;
}

interface MaybePgError {
  message?: string;
  code?: string;
  hint?: string | null;
  details?: string | null;
  name?: string;
  status?: number;
}

const BY_CODE: Record<string, string> = {
  '42501': 'No tiene permiso para realizar esta operación.',
  '23505': 'Ya existe un registro con esos datos.',
  '23503': 'No se puede completar: hay datos relacionados que lo impiden.',
  '23514': 'Los datos no cumplen una regla del sistema.',
  PGRST301: 'Su sesión expiró. Vuelva a iniciar sesión.',
  PGRST116: 'No se encontró el registro solicitado.',
};

export function toAppError(error: unknown): AppError {
  if (!error) return { message: 'Ocurrió un error inesperado.' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { message: 'Sin conexión a internet. Revise su red e inténtelo nuevamente.', code: 'offline' };
  }
  const e = error as MaybePgError;
  const raw = e.message ?? String(error);

  if (/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(raw)) {
    return { message: 'No se pudo conectar con el servidor. Verifique su conexión e inténtelo otra vez.', code: 'network' };
  }
  if (/Invalid login credentials/i.test(raw)) return { message: 'Correo o contraseña incorrectos.' };
  if (/Email not confirmed/i.test(raw)) return { message: 'Debe confirmar su correo antes de iniciar sesión. Revise su bandeja de entrada.' };
  if (/User already registered/i.test(raw)) return { message: 'Ya existe una cuenta con ese correo.' };
  if (/Password should be at least/i.test(raw)) return { message: 'La contraseña es demasiado corta.' };
  if (/rate limit/i.test(raw)) return { message: 'Demasiados intentos. Espere unos minutos e inténtelo de nuevo.' };
  if (/row-level security/i.test(raw)) return { message: 'No tiene permiso para guardar estos datos.', code: '42501' };
  if (/permission denied/i.test(raw)) return { message: 'No tiene permiso para realizar esta operación.', code: '42501' };
  if (/JWT expired/i.test(raw)) return { message: 'Su sesión expiró. Vuelva a iniciar sesión.', code: 'PGRST301' };
  if (/The object exceeded the maximum allowed size|Payload too large/i.test(raw)) {
    return { message: 'La imagen supera el tamaño máximo permitido (5 MB).' };
  }
  if (/mime type .* is not supported/i.test(raw)) return { message: 'Formato de imagen no permitido. Use JPG, PNG o WEBP.' };

  // Los mensajes P0001/22023/P0002 de nuestras funciones ya están en español y son para el usuario.
  if (e.code && ['P0001', 'P0002', '22023'].includes(e.code)) {
    return { message: raw, hint: e.hint ?? undefined, detail: e.details ?? undefined, code: e.code };
  }
  if (e.code && BY_CODE[e.code]) {
    // 42501 de nuestras funciones trae mensaje propio en español
    const own = e.code === '42501' && /permitida|asignada|pertenece|iniciar sesión/i.test(raw);
    return { message: own ? raw : BY_CODE[e.code], code: e.code, hint: e.hint ?? undefined };
  }
  if (/[áéíóúñ¿¡]/i.test(raw)) return { message: raw, code: e.code, hint: e.hint ?? undefined, detail: e.details ?? undefined };
  return { message: 'Ocurrió un error al procesar la solicitud. Inténtelo nuevamente.', code: e.code };
}

export function errorMessage(error: unknown): string {
  return toAppError(error).message;
}
