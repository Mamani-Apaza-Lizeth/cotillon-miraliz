import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { FileText } from 'lucide-react';
import { OrderStatusBadge, OrderTimeline, OrderTotals, PaymentsTable } from '../../components/orders/OrderBits';
import { PaymentPanel } from '../../components/payments/PaymentPanel';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/Modal';
import { EmptyState, ErrorState, Notice, Spinner } from '../../components/ui/Feedback';
import { useAsync } from '../../hooks/useAsync';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { cancelOrder, getOrderDetail, respondQuote } from '../../services/orders';
import { customizationSignedUrl } from '../../lib/storage';
import { errorMessage } from '../../lib/errors';
import { formatDate, formatDateTime, formatMinutes, formatMoney, SALE_UNIT_LABEL } from '../../lib/format';
import { PAYABLE_STATUSES } from '../../lib/orderStatus';

function DesignPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { customizationSignedUrl(path).then(setUrl); }, [path]);
  if (!url) return null;
  return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Diseño de referencia enviado" className="mt-2 h-32 w-32 rounded-xl border border-ink-100 object-cover" /></a>;
}

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const { settings } = useSettings();
  const detail = useAsync(() => getOrderDetail(id), [id]);
  const [confirm, setConfirm] = useState<null | 'cancel' | 'accept' | 'reject'>(null);

  if (detail.loading && !detail.data) return <Spinner />;
  if (detail.error) return <div className="mx-auto max-w-4xl px-4 py-8"><ErrorState message={detail.error} onRetry={detail.reload} /></div>;
  if (!detail.data) {
    return <div className="mx-auto max-w-4xl px-4 py-8"><EmptyState title="Pedido no encontrado" action={<Link to="/mis-pedidos" className="font-bold text-brand-700">Ver mis pedidos</Link>} /></div>;
  }

  const { order, items, history, quotes, payments } = detail.data;
  const openQuote = quotes.find((q) => q.status === 'enviada');
  const isQuote = quotes.length > 0 || order.status.startsWith('cotizacion');
  const canCancel = (settings?.cancellation.customer_statuses ?? ['cotizacion_pendiente', 'cotizacion_enviada', 'cotizacion_vencida', 'pendiente_pago'])
    .includes(order.status) && order.amount_paid === 0;
  const canPay = PAYABLE_STATUSES.includes(order.status) && order.balance > 0;

  const doCancel = async (reason: string) => {
    try {
      await cancelOrder(order.id, reason);
      toast.success('Pedido cancelado.');
      setConfirm(null);
      await detail.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const doRespond = async (accept: boolean, note: string) => {
    if (!openQuote) return;
    try {
      const r = await respondQuote(openQuote.id, accept, note);
      if (r === 'aceptada') toast.success('Cotización aceptada. Ya puede realizar el pago del anticipo.');
      else if (r === 'rechazada') toast.info('Cotización rechazada.');
      else if (r === 'vencida') toast.warning('La cotización venció. La tienda le enviará una nueva propuesta.');
      else toast.warning('Las condiciones de materiales o capacidad cambiaron. La tienda le enviará una nueva cotización.');
      setConfirm(null);
      await detail.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/mis-pedidos" className="text-sm font-bold text-brand-700 hover:underline">← Mis pedidos</Link>
          <h1 className="mt-1 text-3xl">Pedido {order.code}</h1>
          <p className="text-sm text-ink-500">Creado el {formatDateTime(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <section className="card p-5">
        <OrderTimeline order={order} history={history} isQuote={isQuote} />
        {order.status === 'pendiente_pago' && order.reservation_expires_at && (
          <p className="mt-4 text-sm text-amber-800">Sus productos están reservados hasta el {formatDateTime(order.reservation_expires_at)}. Realice el pago del anticipo para confirmar.</p>
        )}
        {order.status === 'cotizacion_pendiente' && <Notice tone="info">La tienda está revisando su solicitud. Le enviaremos el precio y la fecha de entrega.</Notice>}
        {order.status === 'cancelado' && order.cancel_reason && <p className="mt-3 text-sm text-rose-700">Motivo: {order.cancel_reason}</p>}
      </section>

      {openQuote && order.status === 'cotizacion_enviada' && (
        <section className="card space-y-3 border-brand-200 bg-brand-50/50 p-5" aria-labelledby="cot-titulo">
          <h2 id="cot-titulo" className="flex items-center gap-2 text-2xl"><FileText className="h-6 w-6 text-brand-600" aria-hidden />Cotización v{openQuote.version}</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-ink-500">Precio por unidad</dt><dd className="font-bold">{formatMoney(openQuote.unit_price)}</dd></div>
            <div><dt className="text-ink-500">Total de productos</dt><dd className="font-bold">{formatMoney(openQuote.items_total)}</dd></div>
            <div><dt className="text-ink-500">Fecha de entrega propuesta</dt><dd className="font-bold">{formatDate(openQuote.proposed_date)}</dd></div>
            <div><dt className="text-ink-500">Válida hasta</dt><dd className="font-bold">{formatDate(openQuote.valid_until)}</dd></div>
            <div><dt className="text-ink-500">Tiempo de elaboración estimado</dt><dd className="font-bold">{formatMinutes(openQuote.production_minutes)}</dd></div>
            {order.fulfillment === 'entrega' && <div><dt className="text-ink-500">Entrega (se recalcula al aceptar)</dt><dd className="font-bold">{formatMoney(order.delivery_fee)}</dd></div>}
          </dl>
          {openQuote.conditions && <p className="text-sm"><strong>Condiciones:</strong> {openQuote.conditions}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setConfirm('accept')}>Aceptar cotización</Button>
            <Button variant="secondary" onClick={() => setConfirm('reject')}>Rechazar</Button>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card p-5">
          <h2 className="mb-3 text-xl">Detalle</h2>
          <ul className="divide-y divide-ink-100">
            {items.map((it) => (
              <li key={it.id} className="py-3">
                <div className="flex justify-between gap-2">
                  <p className="font-bold">{it.quantity} × {it.product_name}{it.template_name ? ` · ${it.template_name}` : ''}</p>
                  <p>{it.line_total !== null ? formatMoney(it.line_total) : 'Por cotizar'}</p>
                </div>
                <p className="text-xs text-ink-500">{it.unit_price !== null ? `${formatMoney(it.unit_price)} por ${SALE_UNIT_LABEL[it.sale_unit]}` : ''}</p>
                {it.custom_description && <p className="mt-1 text-sm text-ink-700">{it.custom_description}</p>}
                {(it.custom_theme || it.custom_colors) && <p className="text-sm text-ink-500">{[it.custom_theme, it.custom_colors].filter(Boolean).join(' · ')}</p>}
                {it.reference_image_path && <DesignPreview path={it.reference_image_path} />}
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-ink-500">Modalidad:</span> {order.fulfillment === 'entrega' ? 'Entrega a domicilio' : 'Recojo en tienda'}</p>
            <p><span className="text-ink-500">Fecha comprometida:</span> {formatDate(order.promised_date)}</p>
            {order.fulfillment === 'entrega' && <p className="sm:col-span-2"><span className="text-ink-500">Dirección:</span> {order.address_text}{order.address_reference ? ` (${order.address_reference})` : ''}</p>}
            {order.notes && <p className="sm:col-span-2"><span className="text-ink-500">Notas:</span> {order.notes}</p>}
          </div>
        </section>
        <aside className="card h-fit space-y-3 p-5">
          <h2 className="text-xl">Importes</h2>
          <OrderTotals order={order} />
          {canCancel && <Button variant="ghost" className="w-full text-rose-700" onClick={() => setConfirm('cancel')}>Cancelar pedido</Button>}
          {!canCancel && !['entregado', 'cancelado', 'cotizacion_rechazada'].includes(order.status) && (
            <p className="text-xs text-ink-500">{settings?.cancellation.policy_text}</p>
          )}
        </aside>
      </div>

      {canPay && <PaymentPanel order={order} onPaid={() => void detail.reload()} />}

      <section className="space-y-2">
        <h2 className="text-xl">Pagos</h2>
        <PaymentsTable payments={payments} />
      </section>

      <ConfirmDialog open={confirm === 'cancel'} title="Cancelar pedido" danger confirmLabel="Cancelar pedido"
        message="Se liberarán las unidades reservadas. Esta acción no se puede deshacer." reasonLabel="Motivo de la cancelación"
        onConfirm={doCancel} onClose={() => setConfirm(null)} />
      <ConfirmDialog open={confirm === 'accept'} title="Aceptar cotización" confirmLabel="Aceptar"
        message={openQuote ? `Acepta el precio de ${formatMoney(openQuote.items_total)} (más entrega, si corresponde) y la fecha ${formatDate(openQuote.proposed_date)}. Luego podrá pagar el anticipo.` : ''}
        onConfirm={(note) => doRespond(true, note)} onClose={() => setConfirm(null)} />
      <ConfirmDialog open={confirm === 'reject'} title="Rechazar cotización" danger confirmLabel="Rechazar"
        message="La solicitud quedará cerrada. Puede enviar una nueva cuando lo desee." reasonLabel="Cuéntenos el motivo"
        onConfirm={(note) => doRespond(false, note)} onClose={() => setConfirm(null)} />
    </div>
  );
}
