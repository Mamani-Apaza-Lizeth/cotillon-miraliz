// =============================================================================
// Edge Function: stripe-webhook
// -----------------------------------------------------------------------------
// Recibe los eventos de Stripe, VERIFICA LA FIRMA con STRIPE_WEBHOOK_SECRET y
// aplica el resultado mediante payment_apply_provider_result (solo service_role):
//   payment_intent.succeeded       → aprobado (si el monto y la moneda coinciden)
//   payment_intent.payment_failed  → rechazado (con motivo legible)
//   payment_intent.canceled        → cancelado
// La función registra cada event.id en payment_events: un reenvío del mismo
// evento no se aplica dos veces (idempotencia).
// Se despliega con verify_jwt = false (Stripe no envía un JWT de Supabase); la
// autenticidad la garantiza la firma del webhook.
// =============================================================================
import Stripe from 'npm:stripe@17';
import { adminClient } from '../_shared/common.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? 'sk_test_no_configurada', {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const DECLINE_MESSAGES: Record<string, string> = {
  insufficient_funds: 'Fondos insuficientes.',
  generic_decline: 'Tarjeta rechazada por el banco.',
  expired_card: 'Tarjeta vencida.',
  incorrect_cvc: 'Código de seguridad incorrecto.',
  processing_error: 'Error de procesamiento del proveedor.',
  lost_card: 'Tarjeta rechazada.',
  stolen_card: 'Tarjeta rechazada.',
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return respond(405, { error: 'Método no permitido' });
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  if (!webhookSecret) return respond(503, { error: 'Webhook no configurado' });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return respond(400, { error: 'Falta la firma' });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret, undefined, cryptoProvider);
  } catch {
    // Firma inválida: posible falsificación. No se procesa.
    return respond(400, { error: 'Firma inválida' });
  }

  if (!event.type.startsWith('payment_intent.')) return respond(200, { received: true, ignored: event.type });
  const intent = event.data.object as Stripe.PaymentIntent;

  let status: 'aprobado' | 'rechazado' | 'cancelado' | null = null;
  let errorText: string | null = null;
  if (event.type === 'payment_intent.succeeded') status = 'aprobado';
  else if (event.type === 'payment_intent.payment_failed') {
    status = 'rechazado';
    const err = intent.last_payment_error;
    errorText = (err?.decline_code && DECLINE_MESSAGES[err.decline_code]) || (err?.code && DECLINE_MESSAGES[err.code]) || 'Pago rechazado.';
  } else if (event.type === 'payment_intent.canceled') status = 'cancelado';
  if (!status) return respond(200, { received: true, ignored: event.type });

  const amount = (intent.amount_received || intent.amount) / 100;
  const { data, error } = await adminClient().rpc('payment_apply_provider_result', {
    p_provider: 'stripe',
    p_event_id: event.id,
    p_event_type: event.type,
    p_provider_ref: intent.id,
    p_status: status,
    p_amount: Math.round(amount * 100) / 100,
    p_currency: intent.currency.toUpperCase(),
    p_error: errorText,
  });
  if (error) {
    console.error('stripe-webhook: error al aplicar el resultado', error.code);
    // 500 hace que Stripe reintente más tarde; la idempotencia evita duplicados.
    return respond(500, { error: 'No se pudo registrar el resultado' });
  }
  return respond(200, { received: true, result: data });
}
