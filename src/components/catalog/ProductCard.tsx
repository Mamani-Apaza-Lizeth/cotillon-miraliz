import { Link } from 'react-router';
import { Sparkles } from 'lucide-react';
import { ProductImage } from './ProductImage';
import { Badge } from '../ui/Feedback';
import { formatMoney, SALE_UNIT_LABEL } from '../../lib/format';
import { availabilityLabel } from '../../lib/rules';
import type { ProductWithRelations } from '../../types/db';

export function ProductCard({ product, available }: { product: ProductWithRelations; available?: number | null }) {
  const status = availabilityLabel(product, available);
  const image = product.product_images[0];
  return (
    <Link to={`/producto/${product.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-ink-50">
        <ProductImage path={image?.storage_path} alt={image?.alt_text || product.name} seed={product.slug}
          className="transition duration-300 group-hover:scale-105" />
        {product.is_featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-sun-400 px-2 py-1 text-xs font-extrabold text-ink-900">
            <Sparkles className="h-3 w-3" aria-hidden />Destacado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{product.categories?.name}</p>
        <h3 className="text-lg leading-tight group-hover:text-brand-700">{product.name}</h3>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="whitespace-nowrap font-display text-xl font-bold text-brand-600">
              {product.product_type === 'personalizado' && <span className="text-xs font-bold text-ink-500">desde </span>}
              {formatMoney(product.price)}
            </p>
            <p className="text-xs text-ink-500">por {SALE_UNIT_LABEL[product.sale_unit]}{product.units_per_sale > 1 ? ` (${product.units_per_sale} u.)` : ''}</p>
          </div>
          <Badge tone={status.tone}>{status.text}</Badge>
        </div>
      </div>
    </Link>
  );
}
