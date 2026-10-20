// Pagos en línea. El navegador NUNCA marca un pago como aprobado:
//  • Tarjeta: la Edge Function create-card-payment crea el PaymentIntent en Stripe
//    y la confirmación llega por el webhook firmado (stripe-webhook).
//  • QR: en modo de pruebas se usa el proveedor "sandbox_qr", que solo el
//    administrador puede resolver; en producción requiere un proveedor real.
import { supabase } from '../lib/supabase';
import type { Payment, PaymentStatusRow } from '../types/db';

export async function createPaymentAttempt(orderId: string, method: 'tarjeta' | 'qr', amount: number, idempotencyKey: string): Promise<Payment> {
  const { data, error } = await supabase.rpc('create_payment_attempt', {
    p_order: orderId, p_method: method, p_amount: amount, p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data as Payment;
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusRow> {
  const { data, error } = await supabase.rpc('get_payment_status', { p_payment: paymentId });
  if (error) throw error;
  return (data as PaymentStatusRow[])[0];
}

export async function cancelPaymentAttempt(paymentId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_payment_attempt', { p_payment: paymentId });
  if (error) throw error;
}

export interface CardIntentResponse {
  paymentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

/** Pide a la Edge Function que cree (o reutilice) el PaymentIntent de Stripe. */
export async function createCardIntent(orderId: string, amount: number, idempotencyKey: string): Promise<CardIntentResponse> {
  const { data, error } = await supabase.functions.invoke('create-card-payment', {
    body: { orderId, amount, idempotencyKey },
  });
  if (error) {
    let message = 'No se pudo iniciar el pago con tarjeta.';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      }
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(message);
  }
  return data as CardIntentResponse;
}
