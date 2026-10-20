import { useState } from 'react';
import { Link } from 'react-router';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { ProductImage } from '../../components/catalog/ProductImage';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, Notice, PageHeader, Spinner } from '../../components/ui/Feedback';
import { useAsync } from '../../hooks/useAsync';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { cartSubtotal, lineUnitPrice, listCart, removeCartLine, updateCartQuantity, type CartLine } from '../../services/cart';
import { getAvailability } from '../../services/catalog';
import { errorMessage } from '../../lib/errors';
import { formatMoney, SALE_UNIT_LABEL } from '../../lib/format';
import { lineProblem } from '../../lib/rules';

export function CartPage() {
  const { refresh } = useCart();
  const toast = useToast();
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const state = useAsync(async () => {
    const [lines, availability] = await Promise.all([listCart(), getAvailability()]);
    return { lines, availability };
  }, []);

  const change = async (line: CartLine, qty: number) => {
    setBusyLine(line.id);
    try {
      if (qty <= 0) await removeCartLine(line.id);
      else await updateCartQuantity(line.id, Math.min(1000, qty));
      await Promise.all([state.reload(), refresh()]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyLine(null);
    }
  };

  if (state.loading && !state.data) return <Spinner />;
  if (state.error) return <div className="mx-auto max-w-4xl px-4 py-8"><ErrorState message={state.error} onRetry={state.reload} /></div>;
  const lines = state.data?.lines ?? [];
  const problems = lines.map((l) => lineProblem(l, state.data?.availability.get(l.product_id)));
  const hasProblems = problems.some(Boolean);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Mi carrito" />
      {lines.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="h-8 w-8" />} title="Su carrito está vacío" description="Explore el catálogo y agregue lo que necesita para su fiesta."
          action={<ButtonLink to="/catalogo">Ir al catálogo</ButtonLink>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-3">
            {lines.map((line, i) => {
              const img = [...line.products.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
              return (
                <li key={line.id} className="card flex gap-4 p-4">
                  <Link to={`/producto/${line.products.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
                    <ProductImage path={img?.storage_path} alt={line.products.name} seed={line.products.slug} />
                  </Link>
                  <div className="flex flex-1 flex-col gap-1">
                    <Link to={`/producto/${line.products.slug}`} className="font-display text-lg hover:text-brand-700">{line.products.name}</Link>
                    {line.customization_templates && <p className="text-sm text-ink-500">Plantilla: {line.customization_templates.name}</p>}
                    {line.notes && <p className="text-sm text-ink-500">Personalización: {line.notes}</p>}
                    <p className="text-sm text-ink-500">{formatMoney(lineUnitPrice(line))} por {SALE_UNIT_LABEL[line.products.sale_unit]}</p>
                    {problems[i] && <p className="text-sm font-bold text-rose-600" role="alert">{problems[i]}</p>}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-xl border-2 border-ink-200" role="group" aria-label={`Cantidad de ${line.products.name}`}>
                        <button type="button" className="p-2 disabled:opacity-40" aria-label="Restar uno" disabled={busyLine === line.id}
                          onClick={() => change(line, line.quantity - 1)}><Minus className="h-4 w-4" /></button>
                        <span className="w-10 text-center font-bold" aria-live="polite">{line.quantity}</span>
                        <button type="button" className="p-2 disabled:opacity-40" aria-label="Sumar uno" disabled={busyLine === line.id}
                          onClick={() => change(line, line.quantity + 1)}><Plus className="h-4 w-4" /></button>
                      </div>
                      <span className="font-display text-lg">{formatMoney(lineUnitPrice(line) * line.quantity)}</span>
                      <button type="button" className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-sm font-bold text-rose-700 hover:bg-rose-50"
                        onClick={() => change(line, 0)} disabled={busyLine === line.id}>
                        <Trash2 className="h-4 w-4" aria-hidden />Quitar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <aside className="card h-fit space-y-3 p-5">
            <h2 className="text-xl">Resumen</h2>
            <div className="flex justify-between font-bold"><span>Subtotal</span><span>{formatMoney(cartSubtotal(lines))}</span></div>
            <p className="text-xs text-ink-500">El costo de entrega y el total final se calculan y verifican al confirmar el pedido.</p>
            {hasProblems && <Notice tone="warning">Corrija los productos marcados antes de continuar.</Notice>}
            {hasProblems ? (
              <span className="block rounded-2xl bg-ink-100 px-4 py-3 text-center font-bold text-ink-400">Continuar</span>
            ) : (
              <ButtonLink to="/confirmar-pedido" size="lg" className="w-full">Continuar</ButtonLink>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
