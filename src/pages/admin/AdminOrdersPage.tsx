import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { OrderStatusBadge } from '../../components/orders/OrderBits';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Feedback';
import { InputField, SelectField } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { listOrders, type OrderFilters } from '../../services/adminOrders';
import { formatDate, formatDateTime, formatMoney } from '../../lib/format';
import { ORDER_STATUS_LABEL } from '../../lib/orderStatus';
import type { OrderStatus } from '../../types/db';

export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const filters: OrderFilters = {
    status: (params.get('estado') ?? 'activos') as OrderFilters['status'],
    channel: (params.get('canal') ?? '') as OrderFilters['channel'],
    from: params.get('desde') ?? '',
    to: params.get('hasta') ?? '',
    search: params.get('q') ?? '',
  };
  const orders = useAsync(() => listOrders(filters), [params.toString()]);
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };

  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Ventas en línea, cotizaciones y ventas de mostrador." />
      <form className="card mb-4 grid gap-3 p-4 md:grid-cols-5" onSubmit={(e) => { e.preventDefault(); set('q', search.trim()); }}>
        <InputField label="Buscar (código o cliente)" value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => set('q', search.trim())} />
        <SelectField label="Estado" value={filters.status} onChange={(e) => set('estado', e.target.value)}>
          <option value="activos">Activos</option>
          <option value="">Todos</option>
          {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </SelectField>
        <SelectField label="Canal" value={filters.channel} onChange={(e) => set('canal', e.target.value)}>
          <option value="">Todos</option><option value="web">Web</option><option value="mostrador">Mostrador</option>
        </SelectField>
        <InputField label="Desde" type="date" value={filters.from} onChange={(e) => set('desde', e.target.value)} />
        <InputField label="Hasta" type="date" value={filters.to} onChange={(e) => set('hasta', e.target.value)} />
      </form>
      {orders.loading && !orders.data && <Spinner />}
      {orders.error && <ErrorState message={orders.error} onRetry={orders.reload} />}
      {orders.data?.length === 0 && <EmptyState title="No hay pedidos con esos filtros" />}
      {orders.data && orders.data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Canal</th><th>Entrega</th><th>Total</th><th>Saldo</th><th>Estado</th></tr></thead>
            <tbody>
              {orders.data.map((o) => (
                <tr key={o.id} className="hover:bg-brand-50/40">
                  <td><Link to={`/admin/pedidos/${o.id}`} className="font-bold text-brand-700 hover:underline">{o.code}</Link></td>
                  <td>{formatDateTime(o.created_at)}</td>
                  <td>{o.customer_name || '—'}</td>
                  <td>{o.channel === 'web' ? 'Web' : 'Mostrador'}</td>
                  <td>{o.fulfillment === 'entrega' ? 'Domicilio' : 'Recojo'}<span className="block text-xs text-ink-500">{formatDate(o.promised_date)}</span></td>
                  <td>{o.total > 0 ? formatMoney(o.total) : '—'}</td>
                  <td className={o.balance > 0 && o.status !== 'cancelado' ? 'font-bold text-amber-700' : ''}>{formatMoney(o.balance)}</td>
                  <td><OrderStatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
