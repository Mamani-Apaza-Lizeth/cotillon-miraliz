// Parámetros operativos: contacto, entregas, capacidad de producción, pagos y cancelación.
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ErrorState, Notice, PageHeader, Spinner } from '../../components/ui/Feedback';
import { Checkbox, InputField, SelectField, TextAreaField } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { listAllSettings, updateSetting } from '../../services/admin';
import { errorMessage } from '../../lib/errors';
import { ORDER_STATUS_LABEL } from '../../lib/orderStatus';
import type {
  BusinessSettings, CancellationSettings, DeliverySettings, OrderStatus, PaymentSettings, ProductionCapacitySettings,
} from '../../types/db';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const CANCELABLE: OrderStatus[] = ['cotizacion_pendiente', 'cotizacion_enviada', 'cotizacion_vencida', 'pendiente_pago'];

export function AdminSettingsPage() {
  const toast = useToast();
  const { reload: reloadPublic } = useSettings();
  const all = useAsync(listAllSettings, []);
  const [business, setBusiness] = useState<BusinessSettings | null>(null);
  const [delivery, setDelivery] = useState<DeliverySettings | null>(null);
  const [capacity, setCapacity] = useState<ProductionCapacitySettings | null>(null);
  const [payments, setPayments] = useState<PaymentSettings | null>(null);
  const [cancellation, setCancellation] = useState<CancellationSettings | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const get = <T,>(k: string) => all.data?.find((s) => s.key === k)?.value as T | undefined;
    setBusiness(get<BusinessSettings>('business') ?? null);
    setDelivery(get<DeliverySettings>('delivery') ?? null);
    setCapacity(get<ProductionCapacitySettings>('production_capacity') ?? null);
    setPayments(get<PaymentSettings>('payments') ?? null);
    setCancellation(get<CancellationSettings>('cancellation') ?? null);
  }, [all.data]);

  const save = async (key: string, value: unknown) => {
    setSaving(key);
    try {
      await updateSetting(key, value);
      toast.success('Configuración guardada.');
      await Promise.all([all.reload(), reloadPublic()]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  if (all.loading && !all.data) return <Spinner />;
  if (all.error) return <ErrorState message={all.error} onRetry={all.reload} />;
  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" subtitle="Valores iniciales propuestos por el equipo de desarrollo: valídelos con el propietario." />

      {business && (
        <section className="card grid gap-3 p-5 md:grid-cols-2">
          <h2 className="text-xl md:col-span-2">Datos del negocio</h2>
          <InputField label="Nombre" value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
          <InputField label="Ciudad" value={business.city} onChange={(e) => setBusiness({ ...business, city: e.target.value })} />
          <InputField label="Teléfonos (separados por coma)" value={business.phones.join(', ')}
            onChange={(e) => setBusiness({ ...business, phones: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
          <InputField label="Zona horaria" value={business.timezone} disabled hint="America/La_Paz (UTC−4)" />
          <TextAreaField label="Ubicación / referencia" wrapperClassName="md:col-span-2" value={business.address_note} onChange={(e) => setBusiness({ ...business, address_note: e.target.value })} />
          <div><Button loading={saving === 'business'} onClick={() => save('business', business)}>Guardar</Button></div>
        </section>
      )}

      {delivery && (
        <section className="card grid gap-3 p-5 md:grid-cols-3">
          <h2 className="text-xl md:col-span-3">Entregas a domicilio</h2>
          {delivery.origin_is_placeholder && <div className="md:col-span-3"><Notice tone="warning">Las coordenadas del local son provisionales (centro de La Paz). Ingrese las coordenadas reales del negocio.</Notice></div>}
          <Checkbox label="Entregas habilitadas" checked={delivery.enabled} onChange={(e) => setDelivery({ ...delivery, enabled: e.target.checked })} />
          <InputField label="Latitud del local" type="number" step="0.000001" value={delivery.origin_lat} onChange={(e) => setDelivery({ ...delivery, origin_lat: num(e.target.value), origin_is_placeholder: false })} />
          <InputField label="Longitud del local" type="number" step="0.000001" value={delivery.origin_lng} onChange={(e) => setDelivery({ ...delivery, origin_lng: num(e.target.value), origin_is_placeholder: false })} />
          <InputField label="Tarifa base (Bs)" type="number" min={0} step="0.5" value={delivery.base_fee} onChange={(e) => setDelivery({ ...delivery, base_fee: num(e.target.value) })} />
          <InputField label="Por kilómetro (Bs)" type="number" min={0} step="0.5" value={delivery.per_km_fee} onChange={(e) => setDelivery({ ...delivery, per_km_fee: num(e.target.value) })} />
          <InputField label="Tarifa mínima (Bs)" type="number" min={0} step="0.5" value={delivery.min_fee ?? 0} onChange={(e) => setDelivery({ ...delivery, min_fee: num(e.target.value) })} />
          <InputField label="Cobertura máxima (km en línea recta)" type="number" min={0} step="0.5" value={delivery.max_km} onChange={(e) => setDelivery({ ...delivery, max_km: num(e.target.value) })} />
          <p className="text-sm text-ink-500 md:col-span-3">Fórmula: tarifa = base + por_km × distancia en línea recta (Haversine), con mínimo. Es una aproximación: la distancia real por calles suele ser mayor.</p>
          <div><Button loading={saving === 'delivery'} onClick={() => save('delivery', delivery)}>Guardar</Button></div>
        </section>
      )}

      {capacity && (
        <section className="card space-y-3 p-5">
          <h2 className="text-xl">Capacidad de producción</h2>
          {capacity.is_estimate && <Notice tone="warning">Capacidad estimada. Reemplácela por los minutos reales que el taller puede dedicar cada día.</Notice>}
          <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {DAYS.map((d, i) => (
              <InputField key={d} label={`${d} (min)`} type="number" min={0} max={1440} value={capacity.minutes_by_weekday[String(i)] ?? 0}
                onChange={(e) => setCapacity({ ...capacity, is_estimate: false, minutes_by_weekday: { ...capacity.minutes_by_weekday, [String(i)]: num(e.target.value) } })} />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField label="Días antes de iniciar (desde hoy)" type="number" min={0} value={capacity.start_offset_days} onChange={(e) => setCapacity({ ...capacity, start_offset_days: num(e.target.value) })} />
            <InputField label="Días de margen" type="number" min={0} value={capacity.buffer_days} onChange={(e) => setCapacity({ ...capacity, buffer_days: num(e.target.value) })} />
            <InputField label="Días de preparación (reventa)" type="number" min={0} value={capacity.resale_lead_days} onChange={(e) => setCapacity({ ...capacity, resale_lead_days: num(e.target.value) })} />
          </div>
          <Button loading={saving === 'production_capacity'} onClick={() => save('production_capacity', capacity)}>Guardar</Button>
        </section>
      )}

      {payments && (
        <section className="card grid gap-3 p-5 md:grid-cols-3">
          <h2 className="text-xl md:col-span-3">Pagos</h2>
          <SelectField label="Modo" value={payments.mode} onChange={(e) => setPayments({ ...payments, mode: e.target.value as 'test' | 'live' })}
            hint="“Producción” solo debe activarse con un proveedor real contratado y probado.">
            <option value="test">Pruebas</option><option value="live">Producción</option>
          </SelectField>
          <InputField label="Anticipo mínimo (%)" type="number" min={0} max={100} value={payments.min_advance_percent} onChange={(e) => setPayments({ ...payments, min_advance_percent: num(e.target.value) })} />
          <InputField label="Horas de reserva sin pago" type="number" min={1} value={payments.reservation_hours} onChange={(e) => setPayments({ ...payments, reservation_hours: num(e.target.value) })} />
          <InputField label="Vigencia del QR (min)" type="number" min={1} max={60} value={payments.qr_ttl_minutes} onChange={(e) => setPayments({ ...payments, qr_ttl_minutes: num(e.target.value) })} />
          <SelectField label="Proveedor QR" value={payments.qr_provider} onChange={(e) => setPayments({ ...payments, qr_provider: e.target.value })}>
            <option value="sandbox_qr">QR de prueba (solo modo pruebas)</option>
            <option value="none">Deshabilitado</option>
          </SelectField>
          <Checkbox label="Tarjeta habilitada (requiere Stripe configurado)" checked={payments.card_enabled} onChange={(e) => setPayments({ ...payments, card_enabled: e.target.checked })} />
          <TextAreaField label="Indicaciones para transferencias" wrapperClassName="md:col-span-3" value={payments.bank_transfer_note ?? ''} onChange={(e) => setPayments({ ...payments, bank_transfer_note: e.target.value })} />
          <div><Button loading={saving === 'payments'} onClick={() => save('payments', payments)}>Guardar</Button></div>
        </section>
      )}

      {cancellation && (
        <section className="card space-y-3 p-5">
          <h2 className="text-xl">Política de cancelación</h2>
          <p className="text-sm text-ink-500">Estados en los que el cliente puede cancelar en línea (siempre que no tenga pagos):</p>
          <div className="flex flex-wrap gap-4">
            {CANCELABLE.map((s) => (
              <Checkbox key={s} label={ORDER_STATUS_LABEL[s]} checked={cancellation.customer_statuses.includes(s)}
                onChange={(e) => setCancellation({ ...cancellation, customer_statuses: e.target.checked ? [...cancellation.customer_statuses, s] : cancellation.customer_statuses.filter((x) => x !== s) })} />
            ))}
          </div>
          <TextAreaField label="Texto visible para el cliente" value={cancellation.policy_text} onChange={(e) => setCancellation({ ...cancellation, policy_text: e.target.value })} />
          <Button loading={saving === 'cancellation'} onClick={() => save('cancellation', cancellation)}>Guardar</Button>
        </section>
      )}
    </div>
  );
}
