import { useState } from 'react';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Feedback';
import { InputField } from '../../components/ui/Field';
import { ProductImage } from '../../components/catalog/ProductImage';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { listAllProducts, updateProductFlags } from '../../services/catalogAdmin';
import { errorMessage } from '../../lib/errors';
import { formatMoney, SALE_UNIT_LABEL } from '../../lib/format';
import type { ProductWithRelations } from '../../types/db';

export function AdminProductsPage() {
  const toast = useToast();
  const products = useAsync(listAllProducts, []);
  const [search, setSearch] = useState('');

  const toggle = async (p: ProductWithRelations, field: 'is_published' | 'is_featured') => {
    try {
      await updateProductFlags(p.id, { [field]: !p[field] });
      await products.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const list = (products.data ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Productos" actions={<ButtonLink to="/admin/productos/nuevo"><Plus className="h-4 w-4" aria-hidden />Nuevo producto</ButtonLink>} />
      <div className="mb-4 max-w-sm"><InputField label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {products.loading && !products.data && <Spinner />}
      {products.error && <ErrorState message={products.error} onRetry={products.reload} />}
      {products.data?.length === 0 && <EmptyState title="Aún no hay productos" action={<ButtonLink to="/admin/productos/nuevo">Crear el primero</ButtonLink>} />}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th /><th>Producto</th><th>Tipo</th><th>Precio</th><th>Publicado</th><th>Destacado</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="w-14"><div className="h-12 w-12 overflow-hidden rounded-xl"><ProductImage path={p.product_images[0]?.storage_path} alt="" seed={p.slug} /></div></td>
                  <td>
                    <Link to={`/admin/productos/${p.id}`} className="font-bold text-brand-700 hover:underline">{p.name}</Link>
                    <span className="block text-xs text-ink-500">{p.categories?.name}{p.is_demo ? ' · demostración' : ''}</span>
                  </td>
                  <td><Badge tone={p.product_type === 'reventa' ? 'blue' : 'purple'}>{p.product_type}</Badge></td>
                  <td>{formatMoney(p.price)} <span className="text-xs text-ink-500">/ {SALE_UNIT_LABEL[p.sale_unit]}</span></td>
                  <td><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={p.is_published} onChange={() => toggle(p, 'is_published')} aria-label={`Publicar ${p.name}`} /></td>
                  <td><input type="checkbox" className="h-5 w-5 accent-sun-500" checked={p.is_featured} onChange={() => toggle(p, 'is_featured')} aria-label={`Destacar ${p.name}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
