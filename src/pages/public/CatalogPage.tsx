import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Search, SearchX } from 'lucide-react';
import { ProductCard } from '../../components/catalog/ProductCard';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Feedback';
import { SelectField } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { getAvailability, listCategories, listProducts, type CatalogSort } from '../../services/catalog';

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const categorySlug = params.get('categoria') ?? '';
  const type = (params.get('tipo') ?? '') as '' | 'reventa' | 'personalizado';
  const sort = (params.get('orden') ?? 'destacados') as CatalogSort;
  const q = params.get('q') ?? '';
  const [searchText, setSearchText] = useState(q);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => setSearchText(q), [q]);

  const categories = useAsync(listCategories, []);
  const categoryId = useMemo(() => categories.data?.find((c) => c.slug === categorySlug)?.id, [categories.data, categorySlug]);

  const products = useAsync(async () => {
    if (categorySlug && !categories.data) return null;
    const [list, availability] = await Promise.all([
      listProducts({ search: q, categoryId: categoryId ?? (categorySlug ? '00000000-0000-0000-0000-000000000000' : undefined), type, sort }),
      getAvailability(),
    ]);
    return { list, availability };
  }, [q, categoryId, categorySlug, type, sort, categories.data]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const visible = (products.data?.list ?? []).filter((p) => {
    if (!onlyAvailable || p.product_type === 'personalizado') return true;
    const a = products.data?.availability.get(p.id);
    return typeof a === 'number' && a > 0;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Catálogo" subtitle="Encuentra artículos listos para tu fiesta o pide un trabajo personalizado." />

      <form className="card mb-6 grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_1fr]" role="search"
        onSubmit={(e) => { e.preventDefault(); update('q', searchText.trim()); }}>
        <div>
          <label htmlFor="buscar" className="label">Buscar</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input id="buscar" type="search" className="input pl-9" placeholder="Globos, velas, piñata…" value={searchText}
              onChange={(e) => setSearchText(e.target.value)} onBlur={() => update('q', searchText.trim())} maxLength={60} />
          </div>
        </div>
        <SelectField label="Categoría" value={categorySlug} onChange={(e) => update('categoria', e.target.value)}>
          <option value="">Todas</option>
          {categories.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </SelectField>
        <SelectField label="Tipo" value={type} onChange={(e) => update('tipo', e.target.value)}>
          <option value="">Todos</option>
          <option value="reventa">Listos para llevar</option>
          <option value="personalizado">Personalizados</option>
        </SelectField>
        <SelectField label="Ordenar por" value={sort} onChange={(e) => update('orden', e.target.value)}>
          <option value="destacados">Destacados</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="nombre">Nombre</option>
          <option value="recientes">Más recientes</option>
        </SelectField>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink-700 md:col-span-4">
          <input type="checkbox" className="accent-brand-600" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
          Mostrar solo productos con existencias
        </label>
      </form>

      {(products.loading || products.data === null) && !products.error && <Spinner label="Cargando productos…" />}
      {products.error && <ErrorState message={products.error} onRetry={products.reload} />}
      {!products.loading && products.data && !products.error && visible.length === 0 && (
        <EmptyState icon={<SearchX className="h-8 w-8" />} title="No encontramos productos"
          description="Pruebe con otras palabras o quite algunos filtros." />
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((p) => <ProductCard key={p.id} product={p} available={products.data?.availability.get(p.id)} />)}
      </div>
    </div>
  );
}
