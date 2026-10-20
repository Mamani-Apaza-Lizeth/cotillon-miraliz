// Claves de idempotencia: una por intención de operación (compra, pago, cotización).
// Si el usuario pulsa dos veces o la red reintenta, el servidor reconoce la misma
// clave y devuelve el resultado ya creado en lugar de duplicarlo.

export function newIdempotencyKey(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`.slice(0, 100);
}
