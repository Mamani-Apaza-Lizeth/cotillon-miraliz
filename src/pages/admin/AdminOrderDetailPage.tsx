// Gestión completa de un pedido: cotización, estado, pagos, reembolsos y tareas.
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Ban, CheckCircle2, FileSignature, Wallet, XCircle } from 'lucide-react';
import { OrderStatusBadge, OrderTimeline, OrderTotals, PaymentsTable } from '../../components/orders/OrderBits';
import { Button } from '../../components/ui/Button';
import { Badge, EmptyState, ErrorState, Notice, Spinner } from '../../components/ui/Feedback';
import { InputField, SelectField, TextAreaField } from '../../components/ui/Field';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { getOrderDetail, cancelOrder } from '../../services/orders';
import { recordPayment, recordRefund, resolveSandboxQr, sendQuote, updateOrderStatus } from '../../services/adminOrders';
import { assignTask, listTasksForOrder } from '../../services/production';
import { listEmployees } from '../../services/admin';
import { materialCheck } from '../../services/inventory';
import { customizationSignedUrl } from '../../lib/storage';
import { errorMessage, toAppError } from '../../lib/errors';
import { addDays, formatDate, formatDateTime, formatMinutes, formatMoney, formatQty, MEASURE_UNIT_LABEL, SALE_UNIT_LABEL, TASK_STATUS_LABEL, todayInLaPaz } from '../../lib/format';
import { adminNextStatuses, CLOSED_STATUSES, ORDER_STATUS_LABEL, PAYABLE_STATUSES } from '../../lib/orderStatus';
import { newIdempotencyKey } from '../../lib/idempotency';
import type { MaterialCheckRow, OrderStatus, PaymentMethod } from '../../types/db';

function Design({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { customizationSignedUrl(path).then(setUrl); }, [path]);
  return url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Diseño enviado por el cliente" className="mt-2 h-40 w-40 rounded-xl border object-cover" /></a> : null;
}

export function AdminOrderDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const detail = useAsync(() => getOrderDetail(id), [id]);
  const tasks = useAsync(() => listTasksForOrder(id), [id]);
  const employees = useAsync(listEmployees, []);
  const today = todayInLaPaz();

  const [quote, setQuote] = useState({ unitPrice: '', minutes: '', proposedDate: '', validUntil: addDays(today, 3), conditions: '' });
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [checkRows, setCheckRows] = useState<MaterialCheckRow[] | null>(null);
  const [payModal, setPayModal] = useState<null | 'pago' | 'reembolso'>(null);
  const [pay, setPay] = useState({ amount: '', method: 'efectivo' as PaymentMethod, note: '' });
  const [payBusy, setPayBusy] = useState(false);
  const payKey = useRef(newIdempotencyKey('manual'));
  const [cancelOpen, setCancelOpen] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  const reloadAll = async () => { await Promise.all([detail.reload(), tasks.reload()]); };

  if (detail.loading && !detail.data) return <Spinner />;
  if (detail.error) return <ErrorState message={detail.error} onRetry={detail.reload} />;
  if (!detail.data) return <EmptyState title="Pedido no encontrado" />;
  const { order, items, history, quotes, payments } = detail.data;
  const item = items[0];
  const awaitingQuote = ['cotizacion_pendiente', 'cotizacion_enviada', 'cotizacion_vencida'].includes(order.status);
  const next = adminNextStatuses(order.status, order.fulfillment);
  const pendingSandbox = payments.filter((p) => p.status === 'pendiente' && p.provider === 'sandbox_qr');

  const runCheck = async () => {
    if (!item) return;
    try { setCheckRows(await materialCheck(item.product_id, item.quantity)); } catch (e) { toast.error(errorMessage(e)); }
  };

  const submitQuote = async () => {
    const price = Number(quote.unitPrice);
    const minutes = Number(quote.minutes);
    if (!(price > 0) || !Number.isInteger(minutes) || minutes < 0 || !quote.proposedDate || !quote.validUntil) {
      toast.warning('Complete precio, minutos, fecha propuesta y vigencia.');
      return;
    }
    setQuoteBusy(true);
    try {
      await sendQuote(order.id, price, minutes, quote.proposedDate, quote.validUntil, quote.conditions.trim());
      toast.success('Cotización enviada al cliente.');
      await reloadAll();
    } catch (e) {
      const err = toAppError(e);
      toast.error(err.message);
      if (err.hint === 'fecha_no_viable' && err.detail) setQuote((q) => ({ ...q, proposedDate: err.detail as string }));
    } finally {
      setQuoteBusy(false);
    }
  };

  const changeStatus = async (s: OrderStatus) => {
    try {
      await updateOrderStatus(order.id, s, statusNote.trim());
      setStatusNote('');
      toast.success(`Pedido marcado como "${ORDER_STATUS_LABEL[s]}".`);
      await reloadAll();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const submitPayment = async () => {
    const amount = Number(pay.amount);
    if (!(amount > 0)) { toast.warning('Ingrese un monto válido.'); return; }
    setPayBusy(true);
    try {
      if (payModal === 'pago') await recordPayment(order.id, amount, pay.method, pay.note.trim(), payKey.current);
      else await recordRefund(order.id, amount, pay.method, pay.note.trim(), payKey.current);
      toast.success(payModal === 'pago' ? 'Pago registrado.' : 'Reembolso registrado.');
      payKey.current = newIdempotencyKey('manual');
      setPayModal(null);
      setPay({ amount: '', method: 'efectivo', note: '' });
      await reloadAll();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPayBusy(false);
    }
  };

  const sandbox = async (paymentId: string, approve: boolean) => {
    try {
      const r = await resolveSandboxQr(paymentId, approve);
      toast.info(`Pago de prueba: ${r}.`);
      await reloadAll();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const assign = async (taskId: string, employee: string, date: string) => {
    try {
      await assignTask(taskId, employee || null, date || null);
      toast.success('Tarea actualizada.');
      await tasks.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/pedidos" className="text-sm font-bold text-brand-700 hover:underline">← Pedidos</Link>
          <h1 className="text-3xl">Pedido {order.code}</h1>
          <p className="text-sm text-ink-500">{order.channel === 'web' ? 'Web' : 'Mostrador'} · {formatDateTime(order.created_at)} · {order.customer_name || 'Sin nombre'}{order.customer_phone ? ` · ${order.customer_phone}` : ''}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <section className="card p-5"><OrderTimeline order={order} history={history} isQuote={quotes.length > 0 || order.status.startsWith('cotizacion')} /></section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="card p-5">
          <h2 className="mb-3 text-xl">Productos</h2>
          <ul className="divide-y divide-ink-100">
            {items.map((it) => (
              <li key={it.id} className="py-3">
                <div className="flex justify-between gap-2">
                  <p className="font-bold">{it.quantity} × {it.product_name}{it.template_name ? ` · ${it.template_name}` : ''}</p>
                  <p>{it.line_total !== null ? formatMoney(it.line_total) : 'Por cotizar'}</p>
                </div>
                <p className="text-xs text-ink-500">{it.unit_price !== null ? `${formatMoney(it.unit_price)} por ${SALE_UNIT_LABEL[it.sale_unit]}` : ''}{it.requires_production ? ` · producción ${formatMinutes(it.production_minutes)}` : ''}</p>
                {it.custom_description && <p className="mt-1 rounded-xl bg-ink-50 p-2 text-sm">{it.custom_description}</p>}
                {(it.custom_theme || it.custom_colors) && <p className="text-sm text-ink-500">{[it.custom_theme, it.custom_colors].filter(Boolean).join(' · ')}</p>}
                {it.reference_image_path && <Design path={it.reference_image_path} />}
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-1 text-sm">
            <p><span className="text-ink-500">Modalidad:</span> {order.fulfillment === 'entrega' ? `Entrega a domicilio — ${order.address_text}${order.address_reference ? ` (${order.address_reference})` : ''}` : 'Recojo en tienda'}</p>
            {order.delivery_lat !== null && order.delivery_lng !== null && (
              <a className="font-bold text-brand-700 hover:underline" target="_blank" rel="noreferrer"
                href={`https://www.openstreetmap.org/?mlat=${order.delivery_lat}&mlon=${order.delivery_lng}#map=17/${order.delivery_lat}/${order.delivery_lng}`}>Ver ubicación en el mapa</a>
            )}
            <p><span className="text-ink-500">Fecha solicitada:</span> {formatDate(order.requested_date)} · <span className="text-ink-500">Comprometida:</span> {formatDate(order.promised_date)}</p>
            {order.notes && <p><span className="text-ink-500">Notas:</span> {order.notes}</p>}
            {order.cancel_reason && <p className="text-rose-700">Motivo de cancelación: {order.cancel_reason}</p>}
          </div>
        </section>

        <aside className="card h-fit space-y-4 p-5">
          <h2 className="text-xl">Importes</h2>
          <OrderTotals order={order} />
          {PAYABLE_STATUSES.includes(order.status) && order.balance > 0 && (
            <Button className="w-full" icon={<Wallet className="h-4 w-4" />} onClick={() => { setPay({ amount: String(order.balance), method: 'efectivo', note: '' }); setPayModal('pago'); }}>
              Registrar pago en tienda
            </Button>
          )}
          {order.amount_paid > 0 && (
            <Button variant="secondary" className="w-full" onClick={() => { setPay({ amount: '', method: 'efectivo', note: '' }); setPayModal('reembolso'); }}>Registrar reembolso</Button>
          )}
          {next.length > 0 && (
            <div className="space-y-2 border-t border-ink-100 pt-3">
              <p className="label">Cambiar estado</p>
              <InputField label="Nota (opcional)" value={statusNote} maxLength={300} onChange={(e) => setStatusNote(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                {next.map((s) => (
                  <Button key={s} size="sm" variant={s === 'entregado' ? 'sun' : 'secondary'} onClick={() => changeStatus(s)}
                    disabled={s === 'entregado' && order.balance > 0} title={s === 'entregado' && order.balance > 0 ? 'Registre el saldo antes de entregar' : undefined}>
                    {ORDER_STATUS_LABEL[s]}
                  </Button>
                ))}
              </div>
              {next.includes('entregado') && order.balance > 0 && <p className="text-xs text-amber-700">Para entregar, primero registre el saldo pendiente.</p>}
            </div>
          )}
          {!CLOSED_STATUSES.includes(order.status) && (
            <Button variant="ghost" className="w-full text-rose-700" icon={<Ban className="h-4 w-4" />} onClick={() => setCancelOpen(true)}>Cancelar pedido</Button>
          )}
        </aside>
      </div>

      {awaitingQuote && item && (
        <section className="card space-y-4 border-brand-200 p-5">
          <h2 className="flex items-center gap-2 text-xl"><FileSignature className="h-5 w-5 text-brand-600" aria-hidden />
            {order.status === 'cotizacion_enviada' ? 'Reemplazar cotización' : 'Preparar cotización'}</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <InputField label="Precio por unidad (Bs)" type="number" min={0.01} step="0.01" value={quote.unitPrice} onChange={(e) => setQuote({ ...quote, unitPrice: e.target.value })}
              hint={quote.unitPrice ? `Total productos: ${formatMoney(Number(quote.unitPrice) * item.quantity)}` : undefined} />
            <InputField label="Minutos de producción (total)" type="number" min={0} step={1} value={quote.minutes} onChange={(e) => setQuote({ ...quote, minutes: e.target.value })}
              hint={quote.minutes ? formatMinutes(Number(quote.minutes)) : 'Suma de todas las etapas'} />
            <InputField label="Fecha de entrega propuesta" type="date" min={today} value={quote.proposedDate} onChange={(e) => setQuote({ ...quote, proposedDate: e.target.value })}
              hint="Se valida con la capacidad del taller." />
            <InputField label="Válida hasta" type="date" min={today} value={quote.validUntil} onChange={(e) => setQuote({ ...quote, validUntil: e.target.value })} />
          </div>
          <TextAreaField label="Condiciones / observaciones para el cliente" value={quote.conditions} maxLength={1000} onChange={(e) => setQuote({ ...quote, conditions: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <Button loading={quoteBusy} onClick={submitQuote}>Enviar cotización</Button>
            <Button variant="secondary" onClick={runCheck}>Verificar materiales ({item.quantity} u.)</Button>
          </div>
          {checkRows && (checkRows.length === 0 ? (
            <Notice tone="warning">El producto no tiene receta activa: no se reservarán materiales automáticamente. Configure la receta en “Recetas” si corresponde.</Notice>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Material</th><th>Necesario</th><th>Disponible</th><th /></tr></thead>
                <tbody>{checkRows.map((r) => (
                  <tr key={r.stock_item_id}><td>{r.name}</td><td>{formatQty(r.needed)} {MEASURE_UNIT_LABEL[r.unit]}</td><td>{formatQty(r.available)}</td>
                    <td>{r.sufficient ? <Badge tone="green">Suficiente</Badge> : <Badge tone="red">Falta</Badge>}</td></tr>
                ))}</tbody>
              </table>
            </div>
          ))}
          {quotes.length > 0 && (
            <div>
              <p className="label">Historial de cotizaciones</p>
              <ul className="space-y-1 text-sm">
                {quotes.map((q) => (
                  <li key={q.id}>v{q.version}: {formatMoney(q.items_total)} · entrega {formatDate(q.proposed_date)} · <Badge>{q.status}</Badge>{q.decision_note ? ` — ${q.decision_note}` : ''}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {pendingSandbox.length > 0 && (
        <section className="card space-y-3 border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xl">Pagos QR de prueba pendientes</h2>
          <p className="text-sm text-amber-900">Entorno de pruebas: simule la respuesta del banco. Esta opción no existe para pagos reales.</p>
          {pendingSandbox.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{formatMoney(p.amount)}</span><span className="text-sm">vence {formatDateTime(p.expires_at)}</span>
              <Button size="sm" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => sandbox(p.id, true)}>Confirmar pago de prueba</Button>
              <Button size="sm" variant="secondary" icon={<XCircle className="h-4 w-4" />} onClick={() => sandbox(p.id, false)}>Rechazar</Button>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xl">Pagos</h2>
        <PaymentsTable payments={payments} />
      </section>

      {(tasks.data?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl">Tareas de producción</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Tarea</th><th>Estado</th><th>Tiempo</th><th>Responsable</th><th>Fecha programada</th></tr></thead>
              <tbody>
                {tasks.data?.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td><Badge tone={t.status === 'completada' ? 'green' : t.status === 'bloqueada' ? 'red' : 'yellow'}>{TASK_STATUS_LABEL[t.status]}</Badge></td>
                    <td>{formatMinutes(t.spent_minutes)} / {formatMinutes(t.est_minutes)}</td>
                    <td>
                      <select className="input py-1" aria-label={`Responsable de ${t.title}`} value={t.assigned_to ?? ''} disabled={t.status === 'completada'}
                        onChange={(e) => assign(t.id, e.target.value, t.scheduled_date ?? '')}>
                        <option value="">Sin asignar</option>
                        {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.full_name || e.email}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="date" className="input py-1" aria-label={`Fecha de ${t.title}`} value={t.scheduled_date ?? ''} disabled={t.status === 'completada'}
                        onChange={(e) => assign(t.id, t.assigned_to ?? '', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal open={!!payModal} title={payModal === 'pago' ? 'Registrar pago en tienda' : 'Registrar reembolso'} onClose={() => setPayModal(null)}
        footer={<><Button variant="secondary" onClick={() => setPayModal(null)}>Cancelar</Button><Button loading={payBusy} onClick={submitPayment}>Registrar</Button></>}>
        <div className="space-y-3">
          <InputField label="Monto (Bs)" type="number" min={0.01} step="0.01" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })}
            hint={payModal === 'pago' ? `Saldo pendiente: ${formatMoney(order.balance)}` : `Pagado: ${formatMoney(order.amount_paid)}`} />
          <SelectField label="Método" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as PaymentMethod })}>
            <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option>
          </SelectField>
          <TextAreaField label={payModal === 'reembolso' ? 'Motivo del reembolso (obligatorio)' : 'Nota (opcional)'} value={pay.note} maxLength={500}
            onChange={(e) => setPay({ ...pay, note: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog open={cancelOpen} title="Cancelar pedido" danger confirmLabel="Cancelar pedido"
        message={<>Se liberarán las reservas activas. {order.amount_paid > 0 && <strong>El pedido tiene {formatMoney(order.amount_paid)} pagados: registre el reembolso que corresponda.</strong>} Los materiales ya consumidos en producción no se devuelven al inventario automáticamente.</>}
        reasonLabel="Motivo" onClose={() => setCancelOpen(false)}
        onConfirm={async (reason) => {
          try { await cancelOrder(order.id, reason); toast.success('Pedido cancelado.'); setCancelOpen(false); await reloadAll(); }
          catch (e) { toast.error(errorMessage(e)); }
        }} />
    </div>
  );
}
