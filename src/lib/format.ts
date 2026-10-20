// Formatos de moneda, fechas y etiquetas legibles (es-BO).
import type {
  MeasureUnit, MovementType, PaymentMethod, PaymentStatus, SaleUnit, TaskStatus,
} from '../types/db';

const money = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `Bs ${money.format(Number(value))}`;
}

export function formatQty(value: number | null | undefined, decimals = 3): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-BO', { maximumFractionDigits: decimals }).format(Number(value));
}

/** Convierte 'YYYY-MM-DD' en fecha local SIN desplazar el día por la zona horaria. */
export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? parseDateOnly(iso) : new Date(iso);
  return date.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: /T/.test(iso) ? 'America/La_Paz' : undefined });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz',
  });
}

/** Fecha de hoy en La Paz como 'YYYY-MM-DD' (la base de datos usa la misma zona). */
export function todayInLaPaz(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const d = parseDateOnly(isoDate);
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function formatMinutes(min: number): string {
  if (!min) return '0 min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

export const SALE_UNIT_LABEL: Record<SaleUnit, string> = {
  unidad: 'unidad', paquete: 'paquete', caja: 'caja', docena: 'docena', juego: 'juego', metro: 'metro',
};

export const MEASURE_UNIT_LABEL: Record<MeasureUnit, string> = {
  unidad: 'unid.', paquete: 'paq.', caja: 'cajas', metro: 'm', centimetro: 'cm', kilogramo: 'kg', gramo: 'g',
  litro: 'L', mililitro: 'ml', plancha: 'planchas', barra: 'barras', rollo: 'rollos', pliego: 'pliegos',
};

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  entrada: 'Entrada', salida_venta: 'Salida por venta', consumo_produccion: 'Consumo en producción',
  ajuste_positivo: 'Ajuste (+)', ajuste_negativo: 'Ajuste (−)', reserva: 'Reserva', liberacion_reserva: 'Liberación de reserva',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', qr: 'QR',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', fallido: 'Fallido', cancelado: 'Cancelado', expirado: 'Expirado',
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada', bloqueada: 'Bloqueada',
};

export function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
