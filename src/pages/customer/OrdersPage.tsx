import { Link } from 'react-router';
import { Package } from 'lucide-react';
import { OrderStatusBadge } from '../../components/orders/OrderBits';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Feedback';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { listMyOrders } from '../../services/orders';
import { formatDate, formatDateTime, formatMoney } from '../../lib/format';

export function OrdersPage() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const orders = useAsync(() => listMyOrders(userId), [userId]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Mis pedidos" subtitle="Historial, cotizaciones y seguimiento." />
      {orders.loading && !orders.data && <Spinner />}
      {orders.error && <ErrorState message={orders.error} onRetry={orders.reload} />}
      {orders.data?.length === 0 && (
        <EmptyState icon={<Package className="h-8 w-8" />} title="Aún no tiene pedidos" action={<ButtonLink to="/catalogo">Explorar el catálogo</ButtonLink>} />
      )}
      <ul className="space-y-3">
        {orders.data?.map((o) => (
          <li key={o.id}>
            <Link to={`/mis-pedidos/${o.id}`} className="card flex flex-col gap-2 p-4 transition hover:border-brand-200 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-lg">Pedido {o.code}</p>
                <p className="text-sm text-ink-500">{formatDateTime(o.created_at)} · {o.fulfillment === 'entrega' ? 'Entrega a domicilio' : 'Recojo en tienda'}
                  {o.promised_date ? ` · para el ${formatDate(o.promised_date)}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                {o.total > 0 && <span className="font-bold">{formatMoney(o.total)}</span>}
                {o.balance > 0 && o.status !== 'cancelado' && <span className="text-xs font-bold text-amber-700">Saldo {formatMoney(o.balance)}</span>}
                <OrderStatusBadge status={o.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
