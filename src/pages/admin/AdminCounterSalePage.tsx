// Registro de ventas presenciales (solo productos de reventa con existencias).
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ErrorState, Notice, PageHeader, Spinner } from '../../components/ui/Feedback';
import { InputField, SelectField } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { listAllProducts } from '../../services/catalogAdmin';
import { listStockItems } from '../../services/inventory';
import { counterSale } from '../../services/adminOrders';
import { errorMessage } from '../../lib/errors';
import { formatMoney, SALE_UNIT_LABEL } from '../../lib/format';
import { newIdempotencyKey } from '../../lib/idempotency';
import type { PaymentMethod } from '../../types/db';

export function AdminCounterSalePage() {
  const toast = useToast();
  const data = useAsync(async () => {
    const [products, stock] = await Promise.all([listAllProducts(), listStockItems()]);
    const avail = new Map(stock.filter((s) => s.product_id).map((s) => [s.product_id as string, Number(s.quantity) - Number(s.reserved)]));
    return { products: products.filter((p) => p.product_type === 'reventa' && p.price !== null), avail };
  }, []);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [lastSale, setLastSale] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey('counter'));

  const products = useMemo(() => data.data?.products ?? [], [data.data]);
  const filtered = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 30), [products, search]);
  const chosen = products.filter((p) => lines[p.id]);
  const total = chosen.reduce((s, p) => s + Number(p.price) * lines[p.id], 0);

  const setQty = (id: string, qty: number) => setLines((l) => {
    const next = { ...l };
    if (qty <= 0) delete next[id]; else next[id] = qty;
    return next;
  });

  const submit = async () => {
    if (chosen.length === 0) return;
    setBusy(true);
    try {
      const id = await counterSale(chosen.map((p) => ({ product_id: p.id, quantity: lines[p.id] })), method, customer.name.trim(), customer.phone.trim(), '', key.current);
      toast.success('Venta registrada y existencias descontadas.');
      setLastSale(id);
      setLines({});
      setCustomer({ name: '', phone: '' });
      key.current = newIdempotencyKey('counter');
      await data.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (data.loading && !data.data) return <Spinner />;
  if (data.error) return <ErrorState message={data.error} onRetry={data.reload} />;

  return (
    <div>
      <PageHeader title="Venta en mostrador" subtitle="Registra ventas presenciales pagadas en efectivo o por transferencia." />
      {lastSale && <div className="mb-4"><Notice tone="success">Venta registrada. <Link to={`/admin/pedidos/${lastSale}`} className="font-bold underline">Ver comprobante</Link></Notice></div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card p-4">
          <InputField label="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre del producto" />
          <ul className="mt-3 divide-y divide-ink-100">
            {filtered.map((p) => {
              const avail = data.data?.avail.get(p.id) ?? 0;
              const qty = lines[p.id] ?? 0;
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-bold">{p.name}{!p.is_published && <span className="ml-1 text-xs text-ink-400">(no publicado)</span>}</p>
                    <p className="text-xs text-ink-500">{formatMoney(p.price)} por {SALE_UNIT_LABEL[p.sale_unit]} · disponibles: {avail}</p>
                  </div>
                  <div className="inline-flex items-center rounded-xl border-2 border-ink-200">
                    <button type="button" className="p-2 disabled:opacity-40" aria-label={`Restar ${p.name}`} disabled={qty === 0} onClick={() => setQty(p.id, qty - 1)}><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center font-bold">{qty}</span>
                    <button type="button" className="p-2 disabled:opacity-40" aria-label={`Sumar ${p.name}`} disabled={qty >= avail} onClick={() => setQty(p.id, qty + 1)}><Plus className="h-4 w-4" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="card h-fit space-y-3 p-5">
          <h2 className="text-xl">Venta actual</h2>
          {chosen.length === 0 && <p className="text-sm text-ink-500">Agregue productos de la lista.</p>}
          <ul className="space-y-1 text-sm">
            {chosen.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span>{lines[p.id]} × {p.name}</span>
                <span className="flex items-center gap-1">{formatMoney(Number(p.price) * lines[p.id])}
                  <button type="button" onClick={() => setQty(p.id, 0)} aria-label={`Quitar ${p.name}`} className="p-1 text-rose-700"><Trash2 className="h-4 w-4" /></button>
                </span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between text-lg font-extrabold"><span>Total</span><span>{formatMoney(total)}</span></p>
          <SelectField label="Método de pago" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option>
          </SelectField>
          <InputField label="Cliente (opcional)" value={customer.name} maxLength={120} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
          <InputField label="Teléfono (opcional)" value={customer.phone} maxLength={20} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          <Button size="lg" className="w-full" disabled={chosen.length === 0} loading={busy} onClick={submit}>Registrar venta</Button>
        </aside>
      </div>
    </div>
  );
}
