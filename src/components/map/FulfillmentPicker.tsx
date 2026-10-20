// Selección de recojo en tienda o entrega a domicilio, con mapa y tarifa calculada por el servidor.
import { lazy, Suspense, useEffect, useState } from 'react';
import { Store, Truck } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { getDeliveryQuote } from '../../services/orders';
import { listAddresses } from '../../services/account';
import { errorMessage } from '../../lib/errors';
import { formatMoney } from '../../lib/format';
import { InputField, SelectField } from '../ui/Field';
import { Notice, Spinner } from '../ui/Feedback';
import type { CustomerAddress, DeliveryQuote, FulfillmentType } from '../../types/db';

const DeliveryMap = lazy(() => import('./DeliveryMap').then((m) => ({ default: m.DeliveryMap })));

import type { FulfillmentValue } from '../../lib/fulfillment';
export type { FulfillmentValue };

interface Props {
  value: FulfillmentValue;
  onChange: (v: FulfillmentValue) => void;
  onQuote?: (q: DeliveryQuote | null) => void;
  errors?: Record<string, string>;
}

export function FulfillmentPicker({ value, onChange, onQuote, errors = {} }: Props) {
  const { settings } = useSettings();
  const delivery = settings?.delivery;
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);

  useEffect(() => {
    listAddresses().then(setAddresses).catch(() => setAddresses([]));
  }, []);

  // Cotización oficial de la entrega (servidor) cada vez que cambia el punto.
  useEffect(() => {
    if (value.fulfillment !== 'entrega' || value.lat === null || value.lng === null) {
      setQuote(null);
      onQuote?.(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const q = await getDeliveryQuote(value.lat as number, value.lng as number);
        if (!cancelled) { setQuote(q); setQuoteError(null); onQuote?.(q); }
      } catch (e) {
        if (!cancelled) { setQuote(null); setQuoteError(errorMessage(e)); onQuote?.(null); }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.fulfillment, value.lat, value.lng]);

  const option = (type: FulfillmentType, title: string, desc: string, Icon: typeof Store, disabled = false) => (
    <label className={`card flex cursor-pointer items-start gap-3 p-4 transition ${value.fulfillment === type ? 'border-brand-400 ring-2 ring-brand-200' : 'hover:border-ink-200'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
      <input type="radio" name="fulfillment" className="mt-1 accent-brand-600" checked={value.fulfillment === type} disabled={disabled}
        onChange={() => onChange({ ...value, fulfillment: type })} />
      <Icon className="mt-0.5 h-6 w-6 shrink-0 text-brand-600" aria-hidden />
      <span>
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-ink-500">{desc}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-4">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="label">¿Cómo recibirá su pedido?</legend>
        {option('recojo', 'Recojo en tienda', settings?.business.address_note ?? 'La Paz', Store)}
        {option('entrega', 'Entrega a domicilio',
          delivery?.enabled ? `Bs ${delivery.base_fee} + Bs ${delivery.per_km_fee}/km (hasta ${delivery.max_km} km)` : 'No disponible por ahora',
          Truck, !delivery?.enabled)}
      </fieldset>

      {value.fulfillment === 'entrega' && (
        <div className="space-y-3">
          {addresses.length > 0 && (
            <SelectField label="Usar una dirección guardada" value="" onChange={(e) => {
              const a = addresses.find((x) => x.id === e.target.value);
              if (a) onChange({ ...value, addressText: a.address_text, reference: a.reference, lat: a.lat, lng: a.lng });
            }}>
              <option value="">— Elegir —</option>
              {addresses.map((a) => <option key={a.id} value={a.id}>{a.label}: {a.address_text}</option>)}
            </SelectField>
          )}
          <Suspense fallback={<Spinner label="Cargando mapa…" />}>
            <DeliveryMap
              value={value.lat !== null && value.lng !== null ? { lat: value.lat, lng: value.lng } : null}
              onChange={(pos, label) => onChange({ ...value, lat: pos.lat, lng: pos.lng, addressText: label ? label.split(',').slice(0, 3).join(',') : value.addressText })}
              origin={delivery ? { lat: delivery.origin_lat, lng: delivery.origin_lng } : null}
              coverageKm={delivery?.max_km}
            />
          </Suspense>
          {errors.location && <p className="text-xs font-bold text-rose-600" role="alert">{errors.location}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField label="Dirección" value={value.addressText} maxLength={300} error={errors.addressText}
              onChange={(e) => onChange({ ...value, addressText: e.target.value })} placeholder="Calle, número, zona" />
            <InputField label="Referencia" value={value.reference} maxLength={300}
              onChange={(e) => onChange({ ...value, reference: e.target.value })} placeholder="Color de puerta, edificio, piso…" />
          </div>
          {quoting && <p className="text-sm text-ink-500" role="status">Calculando costo de entrega…</p>}
          {quoteError && <Notice tone="danger">{quoteError}</Notice>}
          {quote && !quoting && (
            quote.within_coverage ? (
              <Notice tone="success">
                Distancia aproximada en línea recta: <strong>{quote.distance_km} km</strong> · Costo de entrega: <strong>{formatMoney(quote.fee)}</strong>.
                <span className="block text-xs">El costo se vuelve a validar al confirmar.</span>
              </Notice>
            ) : (
              <Notice tone="warning">La ubicación está a {quote.distance_km} km, fuera del área de cobertura ({delivery?.max_km} km). Elija recojo en tienda o un punto más cercano.</Notice>
            )
          )}
        </div>
      )}
    </div>
  );
}
