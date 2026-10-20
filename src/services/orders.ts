// Pedidos del cliente: compra, cotización, consulta, cancelación y entrega.
import { supabase } from '../lib/supabase';
import type {
  DeliveryQuote, FulfillmentType, Order, OrderItem, OrderStatusHistory, Payment, Quote,
} from '../types/db';

export interface PlaceOrderInput {
  fulfillment: FulfillmentType;
  addressText?: string | null;
  addressReference?: string | null;
  lat?: number | null;
  lng?: number | null;
  requestedDate?: string | null;
  notes?: string;
  idempotencyKey: string;
}

export async function placeOrder(input: PlaceOrderInput): Promise<string> {
  const entrega = input.fulfillment === 'entrega';
  const { data, error } = await supabase.rpc('place_order', {
    p_fulfillment: input.fulfillment,
    p_address_text: entrega ? input.addressText ?? null : null,
    p_address_reference: entrega ? input.addressReference ?? '' : null,
    p_lat: entrega ? input.lat ?? null : null,
    p_lng: entrega ? input.lng ?? null : null,
    p_requested_date: input.requestedDate || null,
    p_notes: input.notes ?? '',
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  return data as string;
}

export interface QuoteRequestInput {
  productId: string;
  quantity: number;
  description: string;
  requestedDate: string;
  fulfillment: FulfillmentType;
  imagePath: string | null;
  templateId: string | null;
  theme?: string;
  colors?: string;
  addressText?: string | null;
  addressReference?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string;
  idempotencyKey: string;
}

export async function requestQuote(input: QuoteRequestInput): Promise<string> {
  const entrega = input.fulfillment === 'entrega';
  const { data, error } = await supabase.rpc('request_quote', {
    p_product: input.productId,
    p_quantity: input.quantity,
    p_description: input.description,
    p_requested_date: input.requestedDate,
    p_fulfillment: input.fulfillment,
    p_image_path: input.imagePath,
    p_template: input.templateId,
    p_theme: input.theme || null,
    p_colors: input.colors || null,
    p_address_text: entrega ? input.addressText ?? null : null,
    p_address_reference: entrega ? input.addressReference ?? '' : null,
    p_lat: entrega ? input.lat ?? null : null,
    p_lng: entrega ? input.lng ?? null : null,
    p_notes: input.notes ?? '',
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  return data as string;
}

export async function listMyOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export interface OrderDetail {
  order: Order;
  items: OrderItem[];
  history: OrderStatusHistory[];
  quotes: Quote[];
  payments: Payment[];
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), order_status_history(*), quotes(*), payments(*)')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { order_items, order_status_history, quotes, payments, ...order } = data as Order & {
    order_items: OrderItem[]; order_status_history: OrderStatusHistory[]; quotes: Quote[]; payments: Payment[];
  };
  return {
    order: order as Order,
    items: order_items ?? [],
    history: [...(order_status_history ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    quotes: [...(quotes ?? [])].sort((a, b) => b.version - a.version),
    payments: [...(payments ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

export async function cancelOrder(orderId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_order', { p_order: orderId, p_reason: reason });
  if (error) throw error;
}

export type QuoteResponse = 'aceptada' | 'rechazada' | 'vencida' | 'condiciones_cambiaron';

export async function respondQuote(quoteId: string, accept: boolean, note?: string): Promise<QuoteResponse> {
  const { data, error } = await supabase.rpc('customer_respond_quote', {
    p_quote: quoteId, p_accept: accept, p_note: note ?? null,
  });
  if (error) throw error;
  return data as QuoteResponse;
}

export async function getDeliveryQuote(lat: number, lng: number): Promise<DeliveryQuote> {
  const { data, error } = await supabase.rpc('delivery_quote', { p_lat: lat, p_lng: lng });
  if (error) throw error;
  const row = (data as DeliveryQuote[])[0];
  return { ...row, distance_km: Number(row.distance_km), fee: Number(row.fee) };
}

export async function getEarliestDate(minutes: number): Promise<string> {
  const { data, error } = await supabase.rpc('earliest_delivery_date', { p_new_minutes: Math.max(0, Math.round(minutes)) });
  if (error) throw error;
  return data as string;
}
