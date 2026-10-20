// Piezas de presentación de pedidos: insignia de estado, línea de tiempo, totales y pagos.
import { Check } from 'lucide-react';
import { Badge } from '../ui/Feedback';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, timelineSteps } from '../../lib/orderStatus';
import { formatDateTime, formatMoney, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from '../../lib/format';
import type { Order, OrderStatus, OrderStatusHistory, Payment } from '../../types/db';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_STATUS_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

export function OrderTimeline({ order, history, isQuote }: { order: Order; history: OrderStatusHistory[]; isQuote: boolean }) {
  if (order.status === 'cancelado' || order.status.startsWith('cotizacion_r') || order.status === 'cotizacion_vencida') {
    return (
      <ol className="space-y-2">
        {history.map((h) => (
          <li key={h.id} className="text-sm"><span className="font-bold">{ORDER_STATUS_LABEL[h.to_status]}</span> · {formatDateTime(h.created_at)}{h.note ? ` — ${h.note}` : ''}</li>
        ))}
      </ol>
    );
  }
  const steps = timelineSteps(isQuote, order.fulfillment);
  const reached = new Set(history.map((h) => h.to_status));
  reached.add(order.status);
  const currentIndex = steps.indexOf(order.status);
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:gap-0" aria-label="Seguimiento del pedido">
      {steps.map((s, i) => {
        const done = i < currentIndex || (reached.has(s) && i <= currentIndex);
        const current = i === currentIndex;
        const when = history.filter((h) => h.to_status === s).at(-1)?.created_at;
        return (
          <li key={s} className="flex flex-1 items-center gap-2 sm:flex-col sm:text-center">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm font-extrabold ${
              current ? 'border-brand-600 bg-brand-600 text-white' : done ? 'border-mint-500 bg-mint-500 text-white' : 'border-ink-200 bg-white text-ink-400'}`}
              aria-current={current ? 'step' : undefined}>
              {done && !current ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span>
              <span className={`block text-xs font-bold ${current ? 'text-brand-700' : 'text-ink-700'}`}>{ORDER_STATUS_LABEL[s]}</span>
              {when && <span className="block text-[11px] text-ink-400">{formatDateTime(when)}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderTotals({ order }: { order: Order }) {
  const pending = order.status === 'cotizacion_pendiente' || order.status === 'cotizacion_enviada';
  return (
    <dl className="space-y-1 text-sm">
      <Row label="Subtotal" value={pending ? 'Por cotizar' : formatMoney(order.subtotal)} />
      {order.fulfillment === 'entrega' && (
        <Row label={`Entrega${order.delivery_distance_km ? ` (${order.delivery_distance_km} km aprox.)` : ''}`} value={formatMoney(order.delivery_fee)} />
      )}
      <Row label="Total" value={pending ? '—' : formatMoney(order.total)} strong />
      {!pending && (
        <>
          <Row label="Pagado" value={formatMoney(order.amount_paid)} />
          <Row label="Saldo pendiente" value={formatMoney(order.balance)} strong={order.balance > 0} />
          {order.required_advance > 0 && order.status === 'pendiente_pago' && (
            <Row label="Anticipo requerido para confirmar" value={formatMoney(order.required_advance)} />
          )}
        </>
      )}
    </dl>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'font-extrabold text-ink-900' : 'text-ink-700'}`}>
      <dt>{label}</dt><dd>{value}</dd>
    </div>
  );
}

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return <p className="text-sm text-ink-500">Aún no hay pagos registrados.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Método</th><th>Monto</th><th>Estado</th><th>Comprobante</th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{formatDateTime(p.confirmed_at ?? p.created_at)}</td>
              <td>{p.kind === 'reembolso' ? 'Reembolso' : 'Pago'}{p.environment === 'test' && <span className="ml-1"><Badge tone="yellow">Prueba</Badge></span>}</td>
              <td>{PAYMENT_METHOD_LABEL[p.method]}</td>
              <td className={p.kind === 'reembolso' ? 'text-rose-700' : ''}>{p.kind === 'reembolso' ? '−' : ''}{formatMoney(p.amount)}</td>
              <td>
                <Badge tone={p.status === 'aprobado' ? 'green' : p.status === 'pendiente' ? 'yellow' : 'red'}>{PAYMENT_STATUS_LABEL[p.status]}</Badge>
                {p.error_message && <span className="block text-xs text-ink-500">{p.error_message}</span>}
              </td>
              <td className="font-mono text-xs">{p.receipt_number ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
