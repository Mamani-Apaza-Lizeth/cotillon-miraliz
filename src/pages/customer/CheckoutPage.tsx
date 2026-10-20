// Confirmación del pedido: entrega o recojo, fecha deseada y resumen.
// Precios, existencias, tarifa y fecha se validan de nuevo en place_order (servidor).
import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { CalendarDays } from 'lucide-react';
import { Button, ButtonLink } from '../../components/ui/Button';
import { ErrorState, Notice, PageHeader, Spinner } from '../../components/ui/Feedback';
import { InputField, TextAreaField } from '../../components/ui/Field';
import { FulfillmentPicker } from '../../components/map/FulfillmentPicker';
import { EMPTY_FULFILLMENT, type FulfillmentValue } from '../../lib/fulfillment';
import { useAsync } from '../../hooks/useAsync';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { cartSubtotal, lineUnitPrice, listCart } from '../../services/cart';
import { placeOrder } from '../../services/orders';
import { toAppError } from '../../lib/errors';
import { addDays, formatDate, formatMoney, todayInLaPaz } from '../../lib/format';
import { newIdempotencyKey } from '../../lib/idempotency';
import type { DeliveryQuote } from '../../types/db';

export function CheckoutPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useCart();
  const { settings } = useSettings();
  const cart = useAsync(listCart, []);
  const [fulfillment, setFulfillment] = useState<FulfillmentValue>(EMPTY_FULFILLMENT);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [dateMode, setDateMode] = useState<'pronto' | 'fecha'>('pronto');
  const [requestedDate, setRequestedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey('order'));

  if (cart.loading && !cart.data) return <Spinner />;
  if (cart.error) return <div className="mx-auto max-w-4xl px-4 py-8"><ErrorState message={cart.error} onRetry={cart.reload} /></div>;
  const lines = cart.data ?? [];
  if (lines.length === 0) return <Navigate to="/carrito" replace />;

  const subtotal = cartSubtotal(lines);
  const fee = fulfillment.fulfillment === 'entrega' && deliveryQuote?.within_coverage ? deliveryQuote.fee : 0;
  const today = todayInLaPaz();
  const advancePct = settings?.payments.min_advance_percent ?? 100;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (fulfillment.fulfillment === 'entrega') {
      if (fulfillment.lat === null || fulfillment.lng === null) e.location = 'Marque el punto de entrega en el mapa.';
      else if (deliveryQuote && !deliveryQuote.within_coverage) e.location = 'La ubicación está fuera del área de cobertura.';
      if (fulfillment.addressText.trim().length < 3) e.addressText = 'Ingrese la dirección.';
    }
    if (dateMode === 'fecha') {
      if (!requestedDate) e.requestedDate = 'Seleccione una fecha.';
      else if (requestedDate < today) e.requestedDate = 'La fecha no puede ser pasada.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    setServerError(null);
    setSuggested(null);
    try {
      const orderId = await placeOrder({
        fulfillment: fulfillment.fulfillment,
        addressText: fulfillment.addressText.trim(),
        addressReference: fulfillment.reference.trim(),
        lat: fulfillment.lat,
        lng: fulfillment.lng,
        requestedDate: dateMode === 'fecha' ? requestedDate : null,
        notes: notes.trim(),
        idempotencyKey: key.current,
      });
      await refresh();
      toast.success('¡Pedido registrado! Ahora puede realizar el pago.');
      navigate(`/mis-pedidos/${orderId}`, { replace: true });
    } catch (e) {
      const err = toAppError(e);
      setServerError(err.message);
      if (err.hint === 'fecha_no_viable' && err.detail) setSuggested(err.detail);
      // Si el servidor rechazó la operación (error de negocio), el próximo intento usa una
      // clave nueva. Ante un error de red se conserva la clave: si el pedido llegó a
      // crearse, el reintento devolverá el mismo pedido en lugar de duplicarlo.
      if (err.code && ['P0001', 'P0002', '22023', '42501'].includes(err.code)) key.current = newIdempotencyKey('order');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Confirmar pedido" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <FulfillmentPicker value={fulfillment} onChange={setFulfillment} onQuote={setDeliveryQuote} errors={errors} />
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-xl"><CalendarDays className="h-5 w-5 text-brand-600" aria-hidden />Fecha de entrega o recojo</h2>
            <label className="flex items-center gap-2 font-semibold">
              <input type="radio" name="fecha" className="accent-brand-600" checked={dateMode === 'pronto'} onChange={() => setDateMode('pronto')} />
              Lo antes posible (calculado según la carga de trabajo)
            </label>
            <label className="flex items-center gap-2 font-semibold">
              <input type="radio" name="fecha" className="accent-brand-600" checked={dateMode === 'fecha'} onChange={() => setDateMode('fecha')} />
              Elegir una fecha
            </label>
            {dateMode === 'fecha' && (
              <InputField label="Fecha deseada" type="date" min={today} max={addDays(today, 365)} value={requestedDate}
                error={errors.requestedDate} onChange={(e) => setRequestedDate(e.target.value)}
                hint="Si la fecha no es posible, le sugeriremos la más próxima disponible." />
            )}
            {suggested && (
              <Notice tone="warning">
                La fecha más próxima disponible es <strong>{formatDate(suggested)}</strong>.{' '}
                <button type="button" className="font-bold underline" onClick={() => { setDateMode('fecha'); setRequestedDate(suggested); setServerError(null); setSuggested(null); }}>
                  Usar esa fecha
                </button>
              </Notice>
            )}
          </section>

          <section className="card p-5">
            <TextAreaField label="Notas para la tienda (opcional)" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
          </section>
        </div>

        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
          <h2 className="text-xl">Resumen</h2>
          <ul className="space-y-1 text-sm">
            {lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <span>{l.quantity} × {l.products.name}{l.customization_templates ? ` (${l.customization_templates.name})` : ''}</span>
                <span className="shrink-0">{formatMoney(lineUnitPrice(l) * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <hr className="border-ink-100" />
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
          {fulfillment.fulfillment === 'entrega' && <div className="flex justify-between text-sm"><span>Entrega</span><span>{deliveryQuote ? formatMoney(fee) : '—'}</span></div>}
          <div className="flex justify-between text-lg font-extrabold"><span>Total</span><span>{formatMoney(subtotal + fee)}</span></div>
          {advancePct < 100 && (
            <p className="text-xs text-ink-500">Para confirmar el pedido se requiere un anticipo mínimo del {advancePct} % ({formatMoney(Math.round((subtotal + fee) * advancePct) / 100)}).</p>
          )}
          <p className="text-xs text-ink-500">Las unidades quedan reservadas por {settings?.payments.reservation_hours ?? 48} horas mientras realiza el pago.</p>
          {serverError && <Notice tone="danger">{serverError}</Notice>}
          <Button size="lg" className="w-full" loading={busy} onClick={submit}>Confirmar pedido</Button>
          <ButtonLink to="/carrito" variant="ghost" className="w-full">Volver al carrito</ButtonLink>
        </aside>
      </div>
    </div>
  );
}
