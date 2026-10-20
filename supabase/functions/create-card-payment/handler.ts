// =============================================================================
// Edge Function: create-card-payment
// -----------------------------------------------------------------------------
// Crea (o reutiliza) un PaymentIntent de Stripe para un intento de pago con
// tarjeta. Flujo:
//   1. Verifica la sesión del usuario (JWT en Authorization).
//   2. Llama a create_payment_attempt COMO EL USUARIO: la base de datos valida
//      que el pedido sea suyo, el estado, el saldo y el monto (no se confía en
//      el navegador).
//   3. Crea el PaymentIntent con el monto GUARDADO en la base de datos y una
//      clave de idempotencia = id del intento (reintentos no duplican cobros).
//   4. Asocia la referencia de Stripe con payment_set_provider_ref (service_role).
// La confirmación definitiva llega por el webhook firmado (stripe-webhook).
// Secretos: STRIPE_SECRET_KEY, STRIPE_CURRENCY, ALLOWED_ORIGINS.
// =============================================================================
import Stripe from 'npm:stripe@17';
import { adminClient, corsHeaders, json, toMinorUnits, userClient, UUID_RE } from '../_shared/common.ts';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const currency = (Deno.env.get('STRIPE_CURRENCY') ?? 'bob').toLowerCase();
const stripe = stripeKey ? new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() }) : null;

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'Método no permitido.' });

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json(req, 401, { error: 'Debe iniciar sesión.' });
  if (!stripe) return json(req, 503, { error: 'El pago con tarjeta no está configurado en el servidor.' });

  let body: { orderId?: unknown; amount?: unknown; idempotencyKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: 'Solicitud inválida.' });
  }
  const orderId = typeof body.orderId === 'string' ? body.orderId : '';
  const amount = typeof body.amount === 'number' ? body.amount : NaN;
  const key = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
  if (!UUID_RE.test(orderId) || !Number.isFinite(amount) || amount <= 0 || key.length < 8 || key.length > 100) {
    return json(req, 400, { error: 'Datos de pago inválidos.' });
  }

  try {
    const admin = adminClient();

    // El modo (pruebas / producción) lo decide la configuración del negocio; la clave debe coincidir.
    const { data: setting } = await admin.from('app_settings').select('value').eq('key', 'payments').single();
    const mode = (setting?.value as { mode?: string } | null)?.mode ?? 'test';
    if ((mode === 'test' && !stripeKey.startsWith('sk_test_')) || (mode === 'live' && !stripeKey.startsWith('sk_live_'))) {
      return json(req, 503, { error: 'La clave del proveedor no corresponde al modo de pagos configurado.' });
    }

    // Validación de negocio como el usuario (propiedad del pedido, saldo, monto mínimo).
    const user = userClient(authorization);
    const { data: attempt, error: attemptError } = await user.rpc('create_payment_attempt', {
      p_order: orderId, p_method: 'tarjeta', p_amount: amount, p_idempotency_key: key,
    });
    if (attemptError || !attempt) {
      return json(req, 400, { error: attemptError?.message ?? 'No se pudo registrar el intento de pago.' });
    }
    if (attempt.status !== 'pendiente') {
      return json(req, 409, { error: 'Este intento de pago ya fue procesado. Actualice la página.' });
    }

    let intent: Stripe.PaymentIntent;
    if (attempt.provider_ref) {
      intent = await stripe.paymentIntents.retrieve(attempt.provider_ref);
    } else {
      intent = await stripe.paymentIntents.create(
        {
          amount: toMinorUnits(Number(attempt.amount)),
          currency,
          payment_method_types: ['card'],
          description: `Cotillón MiraLiz · pedido ${orderId.slice(0, 8)}`,
          metadata: { payment_id: attempt.id, order_id: orderId },
        },
        { idempotencyKey: `miraliz-${attempt.id}` },
      );
      const { error: refError } = await admin.rpc('payment_set_provider_ref', { p_payment: attempt.id, p_provider_ref: intent.id });
      if (refError) {
        await stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
        return json(req, 500, { error: 'No se pudo asociar el pago. Inténtelo nuevamente.' });
      }
    }

    return json(req, 200, {
      paymentId: attempt.id,
      clientSecret: intent.client_secret,
      amount: Number(attempt.amount),
      currency: intent.currency,
    });
  } catch (error) {
    // No se registran datos sensibles: solo el tipo de error.
    console.error('create-card-payment', error instanceof Error ? error.name : 'error');
    const message = error instanceof Stripe.errors.StripeError ? 'El proveedor de pagos rechazó la solicitud.' : 'Error interno al iniciar el pago.';
    return json(req, 502, { error: message });
  }
}
