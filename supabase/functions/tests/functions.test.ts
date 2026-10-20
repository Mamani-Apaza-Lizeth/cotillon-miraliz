// Pruebas de las Edge Functions con Deno (sin Supabase ni Stripe reales).
// Ejecutar desde la raíz del proyecto:
//   cd supabase/functions && deno test --allow-env --allow-net tests/
// Un servidor HTTP local imita el endpoint RPC de PostgREST para verificar QUÉ
// envía la función a la base de datos.
import Stripe from 'npm:stripe@17';

function assertEquals(actual: unknown, expected: unknown, msg?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg ?? 'Valores distintos'}: se esperaba ${JSON.stringify(expected)} y se obtuvo ${JSON.stringify(actual)}`);
  }
}

const WEBHOOK_SECRET = 'whsec_prueba_local';
const rpcCalls: Array<{ name: string; body: Record<string, unknown> }> = [];
let rpcFails = false;

const fakeDb = Deno.serve({ port: 0, hostname: '127.0.0.1', onListen() {} }, async (req) => {
  const url = new URL(req.url);
  const name = url.pathname.replace('/rest/v1/rpc/', '');
  rpcCalls.push({ name, body: await req.json() });
  if (rpcFails) return new Response(JSON.stringify({ code: 'XX000', message: 'falla simulada' }), { status: 500 });
  return new Response(JSON.stringify('aplicado'), { status: 200, headers: { 'Content-Type': 'application/json' } });
});

Deno.env.set('SUPABASE_URL', `http://127.0.0.1:${fakeDb.addr.port}`);
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'clave-de-prueba');
Deno.env.set('STRIPE_WEBHOOK_SECRET', WEBHOOK_SECRET);
Deno.env.delete('STRIPE_SECRET_KEY');

const { handler: webhook } = await import('../stripe-webhook/handler.ts');
const { handler: createCard } = await import('../create-card-payment/handler.ts');
const stripe = new Stripe('sk_test_dummy', { httpClient: Stripe.createFetchHttpClient() });
const crypto = Stripe.createSubtleCryptoProvider();

async function signedRequest(event: Record<string, unknown>, secret = WEBHOOK_SECRET, tamper = false): Promise<Request> {
  const payload = JSON.stringify(event);
  const header = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret, cryptoProvider: crypto });
  return new Request('http://localhost/stripe-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': header },
    body: tamper ? payload.replace('4000', '1') : payload,
  });
}

function intentEvent(id: string, type: string, extra: Record<string, unknown> = {}) {
  return {
    id, object: 'event', type, api_version: '2024-06-20', created: 1, livemode: false, pending_webhooks: 1, request: null,
    data: { object: { id: 'pi_test_1', object: 'payment_intent', amount: 4000, amount_received: 4000, currency: 'bob', ...extra } },
  };
}

Deno.test('webhook: rechaza métodos distintos de POST', async () => {
  assertEquals((await webhook(new Request('http://localhost', { method: 'GET' }))).status, 405);
});

Deno.test('webhook: rechaza solicitudes sin firma', async () => {
  const res = await webhook(new Request('http://localhost', { method: 'POST', body: '{}' }));
  assertEquals(res.status, 400);
});

Deno.test('webhook: rechaza firmas inválidas o contenido alterado', async () => {
  const before = rpcCalls.length;
  assertEquals((await webhook(await signedRequest(intentEvent('evt_a', 'payment_intent.succeeded'), 'whsec_otro'))).status, 400);
  assertEquals((await webhook(await signedRequest(intentEvent('evt_b', 'payment_intent.succeeded'), WEBHOOK_SECRET, true))).status, 400);
  assertEquals(rpcCalls.length, before, 'no debe tocar la base de datos');
});

Deno.test('webhook: ignora eventos que no son de PaymentIntent', async () => {
  const before = rpcCalls.length;
  const res = await webhook(await signedRequest({ ...intentEvent('evt_c', 'charge.succeeded') }));
  assertEquals(res.status, 200);
  assertEquals(rpcCalls.length, before);
});

Deno.test('webhook: pago aprobado se envía a payment_apply_provider_result', async () => {
  const res = await webhook(await signedRequest(intentEvent('evt_ok', 'payment_intent.succeeded')));
  assertEquals(res.status, 200);
  const call = rpcCalls.at(-1)!;
  assertEquals(call.name, 'payment_apply_provider_result');
  assertEquals(call.body.p_status, 'aprobado');
  assertEquals(call.body.p_amount, 40);
  assertEquals(call.body.p_currency, 'BOB');
  assertEquals(call.body.p_event_id, 'evt_ok');
  assertEquals(call.body.p_provider_ref, 'pi_test_1');
});

Deno.test('webhook: fondos insuficientes → rechazado con motivo', async () => {
  await webhook(await signedRequest(intentEvent('evt_nf', 'payment_intent.payment_failed', {
    amount_received: 0, last_payment_error: { code: 'card_declined', decline_code: 'insufficient_funds' },
  })));
  const call = rpcCalls.at(-1)!;
  assertEquals(call.body.p_status, 'rechazado');
  assertEquals(call.body.p_error, 'Fondos insuficientes.');
});

Deno.test('webhook: si la BD falla responde 500 para que Stripe reintente', async () => {
  rpcFails = true;
  const res = await webhook(await signedRequest(intentEvent('evt_err', 'payment_intent.succeeded')));
  rpcFails = false;
  assertEquals(res.status, 500);
});

Deno.test('create-card-payment: exige sesión y configuración', async () => {
  assertEquals((await createCard(new Request('http://localhost', { method: 'GET' }))).status, 405);
  assertEquals((await createCard(new Request('http://localhost', { method: 'POST', body: '{}' }))).status, 401);
  const res = await createCard(new Request('http://localhost', { method: 'POST', headers: { Authorization: 'Bearer x' }, body: '{}' }));
  assertEquals(res.status, 503, 'sin STRIPE_SECRET_KEY la tarjeta queda deshabilitada');
});

Deno.test({ name: 'cierre del servidor de prueba', fn: async () => { await fakeDb.shutdown(); } });
