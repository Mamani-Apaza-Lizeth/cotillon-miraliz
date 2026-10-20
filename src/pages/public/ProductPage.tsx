import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ImagePlus, Minus, Plus, ShoppingCart } from 'lucide-react';
import { ProductImage } from '../../components/catalog/ProductImage';
import { availabilityLabel } from '../../lib/rules';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Badge, EmptyState, ErrorState, Notice, Spinner } from '../../components/ui/Feedback';
import { SelectField, TextAreaField } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { getAvailability, getProductBySlug } from '../../services/catalog';
import { addToCart } from '../../services/cart';
import { errorMessage } from '../../lib/errors';
import { formatMoney, SALE_UNIT_LABEL } from '../../lib/format';

export function ProductPage() {
  const { slug = '' } = useParams();
  const { session } = useAuth();
  const { refresh } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [imageIndex, setImageIndex] = useState(0);
  const [qty, setQty] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const state = useAsync(async () => {
    const [product, availability] = await Promise.all([getProductBySlug(slug), getAvailability()]);
    return { product, available: product ? availability.get(product.id) : undefined };
  }, [slug]);

  if (state.loading) return <Spinner />;
  if (state.error) return <div className="mx-auto max-w-4xl px-4 py-10"><ErrorState message={state.error} onRetry={state.reload} /></div>;
  const product = state.data?.product;
  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <EmptyState title="Producto no disponible" description="Es posible que ya no esté publicado." action={<ButtonLink to="/catalogo">Ir al catálogo</ButtonLink>} />
      </div>
    );
  }

  const available = state.data?.available;
  const status = availabilityLabel(product, available);
  const isCustom = product.product_type === 'personalizado';
  const templates = product.customization_templates ?? [];
  const template = templates.find((t) => t.id === templateId);
  const quantity = qty ?? product.min_order_qty;
  const maxQty = isCustom ? 1000 : Math.max(0, Math.floor(Number(available ?? 0)));
  const outOfStock = !isCustom && maxQty <= 0;
  const unitPrice = Number(product.price ?? 0) + Number(template?.extra_price ?? 0);
  const images = product.product_images;
  const current = images[imageIndex];

  const qtyError = quantity < product.min_order_qty
    ? `La cantidad mínima es ${product.min_order_qty}.`
    : !isCustom && quantity > maxQty ? `Solo hay ${maxQty} disponibles.` : null;
  const needsTemplate = isCustom && templates.length > 0 && !templateId;

  const add = async () => {
    if (!session) {
      navigate(`/ingresar?next=${encodeURIComponent(`/producto/${product.slug}`)}`);
      return;
    }
    setAttempted(true);
    if (qtyError || needsTemplate) return;
    setAdding(true);
    try {
      await addToCart(session.user.id, product.id, quantity, templateId || null, notes.trim());
      await refresh();
      toast.success('Producto agregado al carrito.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-sm text-ink-500" aria-label="Ruta">
        <Link to="/catalogo" className="hover:underline">Catálogo</Link> / {product.categories?.name} / <span className="text-ink-900">{product.name}</span>
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="card aspect-square overflow-hidden">
            <ProductImage path={current?.storage_path} alt={current?.alt_text || product.name} seed={product.slug} />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto" role="list" aria-label="Galería">
              {images.map((img, i) => (
                <button key={img.id} type="button" onClick={() => setImageIndex(i)} role="listitem"
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 ${i === imageIndex ? 'border-brand-500' : 'border-ink-100'}`}
                  aria-label={`Ver imagen ${i + 1}`} aria-current={i === imageIndex}>
                  <ProductImage path={img.storage_path} alt="" seed={product.slug} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <Badge tone={status.tone}>{status.text}</Badge>
            <h1 className="mt-2 text-4xl">{product.name}</h1>
            <p className="mt-2 font-display text-3xl text-brand-600">
              {isCustom && <span className="text-base text-ink-500">desde </span>}{formatMoney(unitPrice)}
              <span className="ml-2 text-base font-sans text-ink-500">por {SALE_UNIT_LABEL[product.sale_unit]}{product.units_per_sale > 1 ? ` de ${product.units_per_sale} u.` : ''}</span>
            </p>
            {!isCustom && typeof available === 'number' && available > 0 && (
              <p className="text-sm text-ink-500">{available} {SALE_UNIT_LABEL[product.sale_unit]}(s) disponibles</p>
            )}
          </div>
          <p className="whitespace-pre-line text-ink-700">{product.description}</p>

          {isCustom && templates.length > 0 && (
            <SelectField label="Plantilla de diseño" value={templateId} onChange={(e) => setTemplateId(e.target.value)}
              error={needsTemplate && attempted ? 'Elija una plantilla o solicite una cotización con su propio diseño.' : undefined}>
              <option value="">— Seleccione —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{Number(t.extra_price) > 0 ? ` (+${formatMoney(t.extra_price)})` : ''}</option>
              ))}
            </SelectField>
          )}
          {template?.description && <p className="-mt-3 text-sm text-ink-500">{template.description}</p>}
          {isCustom && (
            <TextAreaField label="Datos para la personalización" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500}
              placeholder="Nombre, edad, colores preferidos…" hint="Se guardan junto al pedido para el equipo de producción." />
          )}

          <div>
            <span className="label" id="qty-label">Cantidad</span>
            <div className="inline-flex items-center rounded-2xl border-2 border-ink-200 bg-white" role="group" aria-labelledby="qty-label">
              <button type="button" className="p-3 disabled:opacity-40" onClick={() => setQty(Math.max(product.min_order_qty, quantity - 1))}
                disabled={quantity <= product.min_order_qty} aria-label="Restar uno"><Minus className="h-4 w-4" /></button>
              <input type="number" inputMode="numeric" className="w-16 border-0 text-center font-bold focus:outline-none" aria-labelledby="qty-label"
                min={product.min_order_qty} max={maxQty || undefined} value={quantity}
                onChange={(e) => setQty(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
              <button type="button" className="p-3 disabled:opacity-40" onClick={() => setQty(quantity + 1)}
                disabled={!isCustom && quantity >= maxQty} aria-label="Sumar uno"><Plus className="h-4 w-4" /></button>
            </div>
            {qtyError && !outOfStock && <p className="mt-1 text-xs font-bold text-rose-600" role="alert">{qtyError}</p>}
            {product.min_order_qty > 1 && <p className="mt-1 text-xs text-ink-500">Pedido mínimo: {product.min_order_qty}</p>}
          </div>

          {outOfStock ? (
            <Notice tone="warning">Producto agotado por el momento. Comuníquese con la tienda para consultar la reposición.</Notice>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={add} loading={adding} disabled={!!qtyError} icon={<ShoppingCart className="h-5 w-5" />}>
                Agregar al carrito · {formatMoney(unitPrice * quantity)}
              </Button>
              {product.allows_custom_design && (
                <ButtonLink to={`/personalizar/${product.slug}`} size="lg" variant="sun">
                  <ImagePlus className="h-5 w-5" aria-hidden /> Cotizar con mi diseño
                </ButtonLink>
              )}
            </div>
          )}
          {isCustom && (
            <Notice tone="info">
              Los productos personalizados se elaboran a pedido. La fecha de entrega se calcula al confirmar, según la carga de trabajo del taller.
              Si tiene un diseño propio, solicite una cotización: le enviaremos precio y fecha antes de cobrar.
            </Notice>
          )}
        </div>
      </div>
    </div>
  );
}
