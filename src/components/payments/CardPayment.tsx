// Pago con tarjeta mediante Stripe Elements. Los datos de la tarjeta van directo a
// Stripe (nunca pasan por nuestro servidor ni se guardan en la base de datos).
// El pedido se actualiza solo cuando el webhook firmado confirma el resultado.
import { useEffect, useRef, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { CheckCircle2, Lock, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Feedback';
import { useToast } from '../../context/ToastContext';
import { publicEnv } from '../../lib/supabase';
import { createCardIntent, getPaymentStatus } from '../../services/payments';
import { formatMoney } from '../../lib/format';
import { newIdempotencyKey } from '../../lib/idempotency';
import { cardErrorMessage } from '../../lib/rules';
import type { Order } from '../../types/db';

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise && publicEnv?.stripePublishableKey) stripePromise = loadStripe(publicEnv.stripePublishableKey);
  return stripePromise;
}

type Phase = 'form' | 'procesando' | 'esperando_confirmacion' | 'aprobado' | 'rechazado';

function CardForm({ order, amount, onDone, onBack }: { order: Order; amount: number; onDone: (ok: boolean) => void; onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey('card'));
  const paymentId = useRef<string | null>(null);

  // Tras confirmar en Stripe, se espera la confirmación del webhook consultando la BD.
  useEffect(() => {
    if (phase !== 'esperando_confirmacion' || !paymentId.current) return;
    let tries = 0;
    const id = setInterval(async () => {
      tries++;
      try {
        const s = await getPaymentStatus(paymentId.current as string);
        if (s.status === 'aprobado') {
          clearInterval(id);
          setPhase('aprobado');
          toast.success('Pago concretado con éxito.');
          onDone(true);
        } else if (s.status !== 'pendiente') {
          clearInterval(id);
          setPhase('rechazado');
          setError(s.error_message ?? 'El pago no fue aprobado.');
        }
      } catch {
        /* reintenta en el siguiente ciclo */
      }
      if (tries >= 20) {
        clearInterval(id);
        setError('El banco aún no confirmó el pago. Revise el estado del pedido en unos minutos; no vuelva a pagar.');
      }
    }, 3000);
    return () => clearInterval(id);
  }, [phase, onDone, toast]);

  const submit = async () => {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setError(null);
    setPhase('procesando');
    try {
      const intent = await createCardIntent(order.id, amount, key.current);
      paymentId.current = intent.paymentId;
      const result = await stripe.confirmCardPayment(intent.clientSecret, { payment_method: { card } });
      if (result.error) {
        setPhase('rechazado');
        setError(cardErrorMessage(result.error.code, result.error.decline_code));
        key.current = newIdempotencyKey('card'); // un nuevo intento usará un PaymentIntent nuevo
        return;
      }
      setPhase('esperando_confirmacion');
    } catch (e) {
      setPhase('form');
      setError(e instanceof Error ? e.message : 'No se pudo conectar con el proveedor de pagos.');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-ink-700">Monto a pagar: <strong className="font-display text-xl text-brand-700">{formatMoney(amount)}</strong> · Pedido {order.code}</p>
      {(phase === 'form' || phase === 'procesando' || phase === 'rechazado') && (
        <>
          <div className="rounded-xl border-2 border-ink-200 bg-white px-3 py-3">
            <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: '16px', color: '#1f1a33', '::placeholder': { color: '#8d89a6' } } } }} />
          </div>
          <p className="inline-flex items-center gap-1 text-xs text-ink-500"><Lock className="h-3 w-3" aria-hidden />Los datos de la tarjeta se envían cifrados al proveedor; Cotillón MiraLiz no los almacena.</p>
          {error && <Notice tone="danger"><span className="inline-flex items-center gap-2"><XCircle className="h-4 w-4" aria-hidden />{error}</span></Notice>}
          <div className="flex gap-2">
            <Button onClick={submit} loading={phase === 'procesando'} disabled={!stripe}>Pagar {formatMoney(amount)}</Button>
            <Button variant="secondary" onClick={onBack} disabled={phase === 'procesando'}>Volver</Button>
          </div>
        </>
      )}
      {phase === 'esperando_confirmacion' && (
        <Notice tone="info">Procesando… esperando la confirmación del proveedor de pagos. No cierre esta ventana.{error && <span className="block font-bold">{error}</span>}</Notice>
      )}
      {phase === 'aprobado' && (
        <Notice tone="success"><span className="inline-flex items-center gap-2 font-bold"><CheckCircle2 className="h-5 w-5" aria-hidden />Pago concretado con éxito.</span></Notice>
      )}
    </div>
  );
}

export function CardPayment(props: { order: Order; amount: number; onDone: (ok: boolean) => void; onBack: () => void }) {
  const promise = getStripe();
  if (!promise) return <Notice tone="warning">El pago con tarjeta no está configurado.</Notice>;
  return (
    <Elements stripe={promise} options={{ locale: 'es' }}>
      <CardForm {...props} />
    </Elements>
  );
}
