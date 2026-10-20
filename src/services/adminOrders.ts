// Operaciones del administrador sobre pedidos, cotizaciones, pagos y ventas de mostrador.
import { supabase } from '../lib/supabase';
import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from '../types/db';

export interface OrderFilters {
  status?: OrderStatus | '' | 'activos';
  from?: string;
  to?: string;
  search?: string;
  channel?: 'web' | 'mostrador' | '';
}

export async function listOrders(f: OrderFilters = {}): Promise<Order[]> {
  let q = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(300);
  if (f.status === 'activos') {
    q = q.not('status', 'in', '(entregado,cancelado,cotizacion_rechazada)');
  } else if (f.status) {
    q = q.eq('status', f.status);
  }
  if (f.channel) q = q.eq('channel', f.channel);
  if (f.from) q = q.gte('created_at', `${f.from}T00:00:00-04:00`);
  if (f.to) q = q.lte('created_at', `${f.to}T23:59:59-04:00`);
  const term = (f.search ?? '').replace(/[%,()*\\:"'.]/g, ' ').trim();
  if (term) q = q.or(`code.ilike.%${term}%,customer_name.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data as Order[];
}

export async function sendQuote(orderId: string, unitPrice: number, minutes: number, proposedDate: string, validUntil: string, conditions: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_send_quote', {
    p_order: orderId, p_unit_price: unitPrice, p_production_minutes: minutes,
    p_proposed_date: proposedDate, p_valid_until: validUntil, p_conditions: conditions,
  });
  if (error) throw error;
  return data as string;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, note: string): Promise<void> {
  const { error } = await supabase.rpc('admin_update_order_status', { p_order: orderId, p_status: status, p_note: note });
  if (error) throw error;
}

export async function recordPayment(orderId: string, amount: number, method: PaymentMethod, note: string, key: string): Promise<void> {
  const { error } = await supabase.rpc('admin_record_payment', {
    p_order: orderId, p_amount: amount, p_method: method, p_note: note, p_idempotency_key: key,
  });
  if (error) throw error;
}

export async function recordRefund(orderId: string, amount: number, method: PaymentMethod, reason: string, key: string): Promise<void> {
  const { error } = await supabase.rpc('admin_record_refund', {
    p_order: orderId, p_amount: amount, p_method: method, p_reason: reason, p_idempotency_key: key,
  });
  if (error) throw error;
}

export async function resolveSandboxQr(paymentId: string, approve: boolean): Promise<PaymentStatus> {
  const { data, error } = await supabase.rpc('admin_sandbox_resolve_qr', { p_payment: paymentId, p_approve: approve });
  if (error) throw error;
  return data as PaymentStatus;
}

export interface CounterLine {
  product_id: string;
  quantity: number;
}

export async function counterSale(lines: CounterLine[], method: PaymentMethod, customerName: string, customerPhone: string, note: string, key: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_counter_sale', {
    p_items: lines, p_method: method, p_customer_name: customerName, p_customer_phone: customerPhone,
    p_note: note, p_idempotency_key: key,
  });
  if (error) throw error;
  return data as string;
}

export async function runMaintenance(): Promise<{ pedidos_cancelados: number; cotizaciones_vencidas: number }> {
  const { data, error } = await supabase.rpc('run_maintenance');
  if (error) throw error;
  return data as { pedidos_cancelados: number; cotizaciones_vencidas: number };
}
