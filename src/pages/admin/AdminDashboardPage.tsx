// Indicadores calculados en el servidor (admin_dashboard) a partir de datos reales.
import { useState } from 'react';
import { Link } from 'react-router';
import { Wrench } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge, ErrorState, Notice, PageHeader, Spinner, StatCard } from '../../components/ui/Feedback';
import { InputField } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { getDashboard } from '../../services/admin';
import { runMaintenance } from '../../services/adminOrders';
import { errorMessage } from '../../lib/errors';
import { addDays, formatDate, formatMinutes, formatMoney, formatQty, MEASURE_UNIT_LABEL, PAYMENT_METHOD_LABEL, todayInLaPaz } from '../../lib/format';
import { ORDER_STATUS_LABEL } from '../../lib/orderStatus';
import type { OrderStatus, PaymentMethod } from '../../types/db';

export function AdminDashboardPage() {
  const toast = useToast();
  const today = todayInLaPaz();
  const [range, setRange] = useState({ from: addDays(today, -29), to: today });
  const [busy, setBusy] = useState(false);
  const data = useAsync(() => getDashboard(range.from, range.to), [range.from, range.to]);

  const maintenance = async () => {
    setBusy(true);
    try {
      const r = await runMaintenance();
      toast.success(`Mantenimiento: ${r.pedidos_cancelados} reservas vencidas liberadas, ${r.cotizaciones_vencidas} cotizaciones vencidas.`);
      await data.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const d = data.data;
  const maxDay = Math.max(1, ...(d?.ventas_por_dia ?? []).map((x) => Number(x.total)));

  return (
    <div>
      <PageHeader title="Resumen del negocio" subtitle="Cifras calculadas con los registros guardados en la base de datos."
        actions={<Button variant="secondary" icon={<Wrench className="h-4 w-4" />} loading={busy} onClick={maintenance}
          title="Libera reservas vencidas sin pago y marca cotizaciones vencidas">Liberar reservas vencidas</Button>} />
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <InputField label="Desde" type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <InputField label="Hasta" type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} />
      </div>
      {data.loading && !d && <Spinner />}
      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {d && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Ventas registradas" value={formatMoney(d.ventas_registradas)} hint={`${d.pedidos_en_periodo} pedidos en el periodo`} />
            <StatCard label="Ingresos cobrados" value={formatMoney(d.ingresos_cobrados)} hint="Pagos aprobados menos reembolsos" />
            <StatCard label="Saldos por cobrar" value={formatMoney(d.saldos_por_cobrar)} hint="Pedidos activos" tone={d.saldos_por_cobrar > 0 ? 'red' : 'pink'} />
            <StatCard label="Carga de producción" value={formatMinutes(d.carga_trabajo_minutos)} hint={`Próxima fecha factible (1 h): ${formatDate(d.fecha_factible_hoy)}`} />
            <StatCard label="Cotizaciones pendientes" value={d.cotizaciones_pendientes} />
            <StatCard label="Esperando pago" value={d.pagos_pendientes} />
            <StatCard label="Tareas abiertas" value={d.tareas_pendientes} hint={`${d.tareas_sin_asignar} sin asignar`} />
            <StatCard label="Tareas atrasadas" value={d.tareas_atrasadas} tone={d.tareas_atrasadas > 0 ? 'red' : 'pink'} />
          </div>
          <Notice tone="info">“Ventas registradas” suma pedidos confirmados o en curso; no significa que el importe ya se haya cobrado. Los cobros se ven en “Ingresos cobrados”.</Notice>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-3 text-xl">Ventas por día</h2>
              {d.ventas_por_dia.length === 0 ? <p className="text-sm text-ink-500">Sin ventas en el periodo.</p> : (
                <div className="flex h-48 items-end justify-center gap-1" role="img" aria-label="Gráfico de barras de ventas por día">
                  {d.ventas_por_dia.map((v) => (
                    <div key={v.dia} className="group relative flex-1 max-w-14">
                      <div className="rounded-t-md bg-brand-400 transition group-hover:bg-brand-600" style={{ height: `${(Number(v.total) / maxDay) * 180}px` }} />
                      <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-xs text-white group-hover:block">
                        {formatDate(v.dia)}: {formatMoney(v.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="card p-5">
              <h2 className="mb-3 text-xl">Cobros por método</h2>
              {Object.keys(d.ingresos_por_metodo).length === 0 ? <p className="text-sm text-ink-500">Sin cobros en el periodo.</p> : (
                <ul className="space-y-2">
                  {Object.entries(d.ingresos_por_metodo).map(([m, v]) => (
                    <li key={m} className="flex justify-between"><span>{PAYMENT_METHOD_LABEL[m as PaymentMethod]}</span><strong>{formatMoney(Number(v))}</strong></li>
                  ))}
                </ul>
              )}
              <h3 className="mb-2 mt-5 text-lg">Pedidos activos por estado</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(d.pedidos_por_estado).map(([s, n]) => (
                  <Link key={s} to={`/admin/pedidos?estado=${s}`}><Badge tone="blue">{ORDER_STATUS_LABEL[s as OrderStatus]}: {n}</Badge></Link>
                ))}
              </div>
            </section>
            <section className="card p-5">
              <h2 className="mb-3 text-xl">Stock bajo</h2>
              {d.stock_bajo.length === 0 ? <p className="text-sm text-ink-500">Todo en orden.</p> : (
                <ul className="divide-y divide-ink-100 text-sm">
                  {d.stock_bajo.map((s) => (
                    <li key={s.id} className="flex justify-between py-1.5">
                      <span>{s.name} <Badge tone={s.kind === 'material' ? 'purple' : 'blue'}>{s.kind}</Badge></span>
                      <span className="font-bold text-rose-700">{formatQty(Number(s.quantity) - Number(s.reserved))} / mín. {formatQty(s.min_stock)} {MEASURE_UNIT_LABEL[s.unit]}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/admin/inventario" className="mt-3 inline-block text-sm font-bold text-brand-700 hover:underline">Ir al inventario →</Link>
            </section>
            <section className="card p-5">
              <h2 className="mb-3 text-xl">Consumo de materiales en el periodo</h2>
              {d.consumo_materiales.length === 0 ? <p className="text-sm text-ink-500">Sin consumos registrados.</p> : (
                <ul className="divide-y divide-ink-100 text-sm">
                  {d.consumo_materiales.map((c) => (
                    <li key={c.name} className="flex justify-between py-1.5"><span>{c.name}</span><strong>{formatQty(c.total)} {MEASURE_UNIT_LABEL[c.unit]}</strong></li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
