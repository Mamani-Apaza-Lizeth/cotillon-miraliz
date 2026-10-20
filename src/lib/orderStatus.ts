// Etiquetas, colores y reglas de presentación del ciclo de vida del pedido.
// Las transiciones válidas las impone la base de datos (order_transition_allowed);
// aquí solo se replican para mostrar los botones adecuados.
import type { FulfillmentType, OrderStatus } from '../types/db';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  cotizacion_pendiente: 'Cotización pendiente',
  cotizacion_enviada: 'Cotización por aprobar',
  cotizacion_rechazada: 'Cotización rechazada',
  cotizacion_vencida: 'Cotización vencida',
  pendiente_pago: 'Pendiente de pago',
  confirmado: 'Confirmado',
  en_produccion: 'En producción',
  listo: 'Listo',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const ORDER_STATUS_TONE: Record<OrderStatus, 'gray' | 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'pink'> = {
  cotizacion_pendiente: 'yellow',
  cotizacion_enviada: 'pink',
  cotizacion_rechazada: 'gray',
  cotizacion_vencida: 'gray',
  pendiente_pago: 'yellow',
  confirmado: 'blue',
  en_produccion: 'purple',
  listo: 'green',
  en_camino: 'blue',
  entregado: 'green',
  cancelado: 'red',
};

const TRANSITIONS: Array<[OrderStatus, OrderStatus]> = [
  ['cotizacion_pendiente', 'cotizacion_enviada'], ['cotizacion_pendiente', 'cancelado'],
  ['cotizacion_enviada', 'pendiente_pago'], ['cotizacion_enviada', 'cotizacion_rechazada'],
  ['cotizacion_enviada', 'cotizacion_vencida'], ['cotizacion_enviada', 'cancelado'],
  ['cotizacion_vencida', 'cotizacion_enviada'], ['cotizacion_vencida', 'cancelado'],
  ['pendiente_pago', 'confirmado'], ['pendiente_pago', 'cancelado'],
  ['confirmado', 'en_produccion'], ['confirmado', 'listo'], ['confirmado', 'cancelado'],
  ['en_produccion', 'listo'], ['en_produccion', 'cancelado'],
  ['listo', 'en_camino'], ['listo', 'entregado'], ['listo', 'cancelado'],
  ['en_camino', 'entregado'], ['en_camino', 'listo'],
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS.some(([a, b]) => a === from && b === to);
}

/** Estados que el administrador puede fijar manualmente desde el panel. */
export function adminNextStatuses(from: OrderStatus, fulfillment: FulfillmentType): OrderStatus[] {
  const manual: OrderStatus[] = ['en_produccion', 'listo', 'en_camino', 'entregado'];
  return manual.filter((to) => canTransition(from, to) && (to !== 'en_camino' || fulfillment === 'entrega'));
}

export const CLOSED_STATUSES: OrderStatus[] = ['entregado', 'cancelado', 'cotizacion_rechazada'];
export const PAYABLE_STATUSES: OrderStatus[] = ['pendiente_pago', 'confirmado', 'en_produccion', 'listo', 'en_camino'];

/** Pasos visibles para el cliente en la línea de tiempo del pedido. */
export function timelineSteps(isQuote: boolean, fulfillment: FulfillmentType): OrderStatus[] {
  const steps: OrderStatus[] = isQuote ? ['cotizacion_pendiente', 'cotizacion_enviada'] : [];
  steps.push('pendiente_pago', 'confirmado', 'en_produccion', 'listo');
  if (fulfillment === 'entrega') steps.push('en_camino');
  steps.push('entregado');
  return steps;
}
