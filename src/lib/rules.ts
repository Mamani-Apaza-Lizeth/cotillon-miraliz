// Reglas de presentación puras (sin React) usadas por varias pantallas.
// Se mantienen aquí para poder probarlas de forma aislada (src/lib/rules.test.ts).
// Las reglas DEFINITIVAS viven en PostgreSQL; estas solo anticipan el resultado en la interfaz.
import type { PaymentStatus, ProductWithRelations } from '../types/db';
import type { CartLine } from '../services/cart';
import type { RecipeWithLines } from '../services/production';

export type BadgeTone = 'gray' | 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'pink';

/** Etiqueta de disponibilidad de un producto en el catálogo. */
export function availabilityLabel(product: Pick<ProductWithRelations, 'product_type'>, available: number | null | undefined): { text: string; tone: BadgeTone } {
  if (product.product_type === 'personalizado') return { text: 'Hecho a pedido', tone: 'purple' };
  if (available === undefined) return { text: 'Consultando…', tone: 'gray' };
  if (available === null || available <= 0) return { text: 'Agotado', tone: 'red' };
  if (available <= 5) return { text: `Últimas ${available}`, tone: 'yellow' };
  return { text: 'Disponible', tone: 'green' };
}

/** Problema que impide confirmar una línea del carrito (o null si está bien). */
export function lineProblem(line: CartLine, available: number | null | undefined): string | null {
  if (!line.products.is_published || line.products.price === null) return 'Ya no está disponible. Quítelo del carrito.';
  if (line.quantity < line.products.min_order_qty) return `La cantidad mínima es ${line.products.min_order_qty}.`;
  if (line.products.product_type === 'reventa') {
    const a = typeof available === 'number' ? available : 0;
    if (a <= 0) return 'Agotado.';
    if (line.quantity > a) return `Solo hay ${a} disponibles.`;
  }
  return null;
}

/** Costo ESTIMADO de materiales por unidad (null si falta algún costo de referencia). */
export function recipeEstimatedCost(recipe: Pick<RecipeWithLines, 'recipe_materials' | 'yield_qty'>, costs: Map<string, number | null>): number | null {
  let total = 0;
  for (const m of recipe.recipe_materials) {
    const c = costs.get(m.stock_item_id);
    if (c === null || c === undefined) return null;
    total += c * Number(m.quantity);
  }
  return Math.round((total / recipe.yield_qty) * 100) / 100;
}

/** Solo se permite redirigir a rutas internas (evita redirecciones abiertas). */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}

/** Mensajes comprensibles para los códigos de rechazo de tarjeta de Stripe. */
export function cardErrorMessage(code?: string, declineCode?: string): string {
  if (declineCode === 'insufficient_funds') return 'Fondos insuficientes en la tarjeta.';
  if (declineCode === 'lost_card' || declineCode === 'stolen_card') return 'La tarjeta fue rechazada por el banco emisor.';
  switch (code) {
    case 'card_declined': return 'La tarjeta fue rechazada.';
    case 'expired_card': return 'La tarjeta está vencida.';
    case 'incorrect_cvc': return 'El código de seguridad (CVC) es incorrecto.';
    case 'incorrect_number': case 'invalid_number': return 'El número de tarjeta no es válido.';
    case 'processing_error': return 'Ocurrió un error al procesar la tarjeta. Inténtelo nuevamente.';
    case 'payment_intent_authentication_failure': return 'No se completó la verificación de la tarjeta.';
    default: return 'No se pudo completar el pago con tarjeta.';
  }
}

export type QrPhase = 'creando' | 'esperando' | 'verificado' | 'rechazado' | 'expirado' | 'error' | 'cancelado';

/** Traduce el estado guardado en la BD a la fase visible del pago QR. */
export function qrPhaseFromStatus(status: PaymentStatus): QrPhase {
  switch (status) {
    case 'aprobado': return 'verificado';
    case 'rechazado': case 'fallido': return 'rechazado';
    case 'expirado': return 'expirado';
    case 'cancelado': return 'cancelado';
    default: return 'esperando';
  }
}
