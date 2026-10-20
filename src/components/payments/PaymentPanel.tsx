// Panel de pago del cliente: elige monto (anticipo o saldo) y método (QR o tarjeta).
// La confirmación de un pago NUNCA ocurre en el navegador: se consulta el estado
// guardado en la base de datos, que solo cambia por el proveedor o el administrador.
import { lazy, Suspense, useMemo, useState } from 'react';
import { CreditCard, QrCode } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { publicEnv } from '../../lib/supabase';
import { formatMoney } from '../../lib/format';
import { Notice, Spinner } from '../ui/Feedback';
import { QrPayment } from './QrPayment';
import type { Order } from '../../types/db';

const CardPayment = lazy(() => import('./CardPayment').then((m) => ({ default: m.CardPayment })));

export function PaymentPanel({ order, onPaid }: { order: Order; onPaid: () => void }) {
  const { settings } = useSettings();
  const pay = settings?.payments;
  const advanceDue = Math.max(0, Math.round((order.required_advance - order.amount_paid) * 100) / 100);
  const minAmount = Math.min(order.balance, advanceDue);
  const [choice, setChoice] = useState<'anticipo' | 'total'>(advanceDue > 0 && advanceDue < order.balance ? 'anticipo' : 'total');
  const [method, setMethod] = useState<'qr' | 'tarjeta' | null>(null);
  const amount = choice === 'anticipo' && minAmount > 0 ? minAmount : order.balance;

  const cardAvailable = !!pay?.card_enabled && !!publicEnv?.stripePublishableKey;
  const qrAvailable = pay?.qr_provider === 'sandbox_qr' ? pay.mode === 'test' : false;
  const testMode = pay?.mode === 'test';

  const amountOptions = useMemo(() => {
    const opts: Array<{ key: 'anticipo' | 'total'; label: string; value: number }> = [];
    if (advanceDue > 0 && advanceDue < order.balance) opts.push({ key: 'anticipo', label: 'Pagar el anticipo', value: advanceDue });
    opts.push({ key: 'total', label: 'Pagar el saldo completo', value: order.balance });
    return opts;
  }, [advanceDue, order.balance]);

  return (
    <section className="card space-y-4 p-5" aria-labelledby="pago-titulo">
      <h2 id="pago-titulo" className="text-2xl">Pagar</h2>
      {testMode && (
        <Notice tone="warning">
          <strong>Entorno de pruebas.</strong> Las operaciones no mueven dinero real. Use solo las tarjetas de prueba indicadas en el manual.
        </Notice>
      )}

      {!method && (
        <>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="label">Monto</legend>
            {amountOptions.map((o) => (
              <label key={o.key} className={`card flex cursor-pointer items-center justify-between gap-3 p-3 ${choice === o.key ? 'border-brand-400 ring-2 ring-brand-200' : ''}`}>
                <span className="flex items-center gap-2">
                  <input type="radio" name="monto" className="accent-brand-600" checked={choice === o.key} onChange={() => setChoice(o.key)} />
                  <span className="font-bold">{o.label}</span>
                </span>
                <span className="font-display text-lg text-brand-700">{formatMoney(o.value)}</span>
              </label>
            ))}
          </fieldset>

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={!qrAvailable} onClick={() => setMethod('qr')}
              className="card flex items-center gap-3 p-4 text-left transition hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-50">
              <QrCode className="h-8 w-8 text-brand-600" aria-hidden />
              <span><span className="block font-bold">Pago con QR</span>
                <span className="block text-xs text-ink-500">{qrAvailable ? 'Escanee el código con su aplicación bancaria' : 'Aún no disponible'}</span></span>
            </button>
            <button type="button" disabled={!cardAvailable} onClick={() => setMethod('tarjeta')}
              className="card flex items-center gap-3 p-4 text-left transition hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-50">
              <CreditCard className="h-8 w-8 text-brand-600" aria-hidden />
              <span><span className="block font-bold">Tarjeta de débito o crédito</span>
                <span className="block text-xs text-ink-500">{cardAvailable ? 'Procesado de forma segura por el proveedor' : 'Aún no disponible'}</span></span>
            </button>
          </div>
          <p className="text-xs text-ink-500">
            También puede pagar en efectivo o por transferencia en la tienda; el personal registrará su pago.
            {pay?.bank_transfer_note ? ` ${pay.bank_transfer_note}` : ''}
          </p>
        </>
      )}

      {method === 'qr' && <QrPayment order={order} amount={amount} onDone={(ok) => { if (ok) onPaid(); }} onBack={() => setMethod(null)} />}
      {method === 'tarjeta' && (
        <Suspense fallback={<Spinner label="Preparando pago seguro…" />}>
          <CardPayment order={order} amount={amount} onDone={(ok) => { if (ok) onPaid(); }} onBack={() => setMethod(null)} />
        </Suspense>
      )}
    </section>
  );
}
