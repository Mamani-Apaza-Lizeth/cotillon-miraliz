// Alta y edición de productos, fotos (Storage) y plantillas de personalización.
import { useEffect, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ErrorState, Notice, PageHeader, Spinner } from '../../components/ui/Feedback';
import { Checkbox, InputField, SelectField, TextAreaField } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/Modal';
import { ProductImage } from '../../components/catalog/ProductImage';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import {
  addProductImage, deleteProduct, deleteProductImage, deleteTemplate, getProductForEdit, listAllCategories, saveProduct, saveTemplate,
} from '../../services/catalogAdmin';
import { errorMessage } from '../../lib/errors';
import { formatMoney, slugify } from '../../lib/format';
import { fieldErrors, productSchema, validateImageFile } from '../../lib/validation';
import type { ProductType, SaleUnit } from '../../types/db';

interface FormState {
  name: string; slug: string; description: string; category_id: string; product_type: ProductType; sale_unit: SaleUnit;
  units_per_sale: string; price: string; min_order_qty: string; allows_custom_design: boolean; is_published: boolean; is_featured: boolean;
}

const EMPTY: FormState = {
  name: '', slug: '', description: '', category_id: '', product_type: 'reventa', sale_unit: 'unidad',
  units_per_sale: '1', price: '', min_order_qty: '1', allows_custom_design: false, is_published: false, is_featured: false,
};

export function AdminProductEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'nuevo';
  const navigate = useNavigate();
  const toast = useToast();
  const categories = useAsync(listAllCategories, []);
  const product = useAsync(() => (isNew ? Promise.resolve(null) : getProductForEdit(id as string)), [id]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tpl, setTpl] = useState({ name: '', description: '', extra_price: '0' });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const p = product.data;
    if (p) {
      setForm({
        name: p.name, slug: p.slug, description: p.description, category_id: p.category_id, product_type: p.product_type,
        sale_unit: p.sale_unit, units_per_sale: String(p.units_per_sale), price: p.price === null ? '' : String(p.price),
        min_order_qty: String(p.min_order_qty), allows_custom_design: p.allows_custom_design, is_published: p.is_published, is_featured: p.is_featured,
      });
      setSlugTouched(true);
    }
  }, [product.data]);

  if ((product.loading && !isNew) || categories.loading) return <Spinner />;
  if (product.error) return <ErrorState message={product.error} onRetry={product.reload} />;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => {
    const next = { ...f, [k]: v };
    if (k === 'name' && !slugTouched) next.slug = slugify(String(v));
    if (k === 'product_type' && v === 'reventa') next.allows_custom_design = false;
    return next;
  });

  const save = async () => {
    const parsed = productSchema.safeParse({ ...form, price: form.price === '' ? null : form.price });
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({});
    setSaving(true);
    try {
      const newId = await saveProduct(parsed.data, isNew ? undefined : (id as string));
      toast.success('Producto guardado.');
      if (isNew) navigate(`/admin/productos/${newId}`, { replace: true });
      else await product.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || isNew) return;
    const problem = validateImageFile(file);
    if (problem) { toast.warning(problem); return; }
    setUploading(true);
    try {
      await addProductImage(id as string, file, form.name, product.data?.product_images.length ?? 0);
      toast.success('Imagen agregada.');
      await product.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const addTemplate = async () => {
    if (isNew || tpl.name.trim().length < 2) { toast.warning('Ingrese el nombre de la plantilla.'); return; }
    try {
      await saveTemplate({ product_id: id as string, name: tpl.name.trim(), description: tpl.description.trim(), extra_price: Number(tpl.extra_price) || 0 });
      setTpl({ name: '', description: '', extra_price: '0' });
      await product.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={isNew ? 'Nuevo producto' : `Editar: ${product.data?.name ?? ''}`}
        actions={!isNew && product.data?.is_published ? <Link to={`/producto/${form.slug}`} className="font-bold text-brand-700 hover:underline">Ver en la tienda →</Link> : undefined} />
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <InputField label="Nombre" value={form.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />
        <InputField label="Identificador en la URL (slug)" value={form.slug} error={errors.slug}
          onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />
        <SelectField label="Categoría" value={form.category_id} error={errors.category_id} onChange={(e) => set('category_id', e.target.value)}>
          <option value="">— Seleccione —</option>
          {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ' (inactiva)'}</option>)}
        </SelectField>
        <SelectField label="Tipo" value={form.product_type} onChange={(e) => set('product_type', e.target.value as ProductType)} disabled={!isNew}
          hint={!isNew ? 'El tipo no se cambia después de crear el producto.' : 'Reventa: se vende de inventario. Personalizado: se elabora a pedido.'}>
          <option value="reventa">Reventa (con existencias)</option>
          <option value="personalizado">Personalizado (a pedido)</option>
        </SelectField>
        <SelectField label="Unidad de venta" value={form.sale_unit} onChange={(e) => set('sale_unit', e.target.value as SaleUnit)}>
          {['unidad', 'paquete', 'caja', 'docena', 'juego', 'metro'].map((u) => <option key={u} value={u}>{u}</option>)}
        </SelectField>
        <InputField label="Unidades por presentación" type="number" min={1} value={form.units_per_sale} error={errors.units_per_sale}
          onChange={(e) => set('units_per_sale', e.target.value)} hint="Ej.: 50 globos por paquete." />
        <InputField label="Precio (Bs)" type="number" min={0} step="0.01" value={form.price} error={errors.price}
          onChange={(e) => set('price', e.target.value)} hint="Precio vigente. Los pedidos ya realizados conservan su precio." />
        <InputField label="Cantidad mínima por pedido" type="number" min={1} value={form.min_order_qty} error={errors.min_order_qty}
          onChange={(e) => set('min_order_qty', e.target.value)} />
        <TextAreaField label="Descripción" value={form.description} maxLength={2000} wrapperClassName="md:col-span-2" onChange={(e) => set('description', e.target.value)} />
        <div className="flex flex-wrap gap-4 md:col-span-2">
          <Checkbox label="Publicado en la tienda" checked={form.is_published} onChange={(e) => set('is_published', e.target.checked)} />
          <Checkbox label="Destacado" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} />
          <Checkbox label="Acepta diseño propio del cliente (cotización)" checked={form.allows_custom_design}
            disabled={form.product_type !== 'personalizado'} onChange={(e) => set('allows_custom_design', e.target.checked)} />
        </div>
        {errors.allows_custom_design && <p className="text-xs font-bold text-rose-600 md:col-span-2">{errors.allows_custom_design}</p>}
        {form.product_type === 'personalizado' && (
          <Notice tone="info">Para poder venderse con plantilla, el producto necesita una receta activa (materiales y etapas) en “Recetas”.</Notice>
        )}
        <div className="flex gap-2 md:col-span-2">
          <Button loading={saving} onClick={save}>Guardar</Button>
          {!isNew && <Button variant="ghost" className="text-rose-700" onClick={() => setConfirmDelete(true)}>Eliminar</Button>}
        </div>
      </section>

      {!isNew && product.data && (
        <section className="card space-y-3 p-5">
          <h2 className="text-xl">Fotografías</h2>
          <div className="flex flex-wrap gap-3">
            {product.data.product_images.map((img) => (
              <div key={img.id} className="relative h-28 w-28 overflow-hidden rounded-2xl border border-ink-100">
                <ProductImage path={img.storage_path} alt={img.alt_text} seed={form.slug} />
                <button type="button" className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-rose-700 shadow" aria-label="Eliminar foto"
                  onClick={async () => { try { await deleteProductImage(img.id, img.storage_path); await product.reload(); } catch (e) { toast.error(errorMessage(e)); } }}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <label className="grid h-28 w-28 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 text-center text-xs font-bold text-brand-700 hover:bg-brand-100">
              <span><ImagePlus className="mx-auto h-6 w-6" aria-hidden />{uploading ? 'Subiendo…' : 'Agregar foto'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onImage} disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-ink-500">JPG, PNG o WEBP de hasta 5 MB. La primera foto es la portada.</p>
        </section>
      )}

      {!isNew && product.data?.product_type === 'personalizado' && (
        <section className="card space-y-3 p-5">
          <h2 className="text-xl">Plantillas de personalización</h2>
          <ul className="divide-y divide-ink-100">
            {(product.data.customization_templates ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div><p className="font-bold">{t.name} {Number(t.extra_price) > 0 && <span className="text-sm text-ink-500">(+{formatMoney(t.extra_price)})</span>}</p><p className="text-sm text-ink-500">{t.description}</p></div>
                <div className="flex items-center gap-2">
                  <Checkbox label="Activa" checked={t.is_active}
                    onChange={async (e) => { try { await saveTemplate({ ...t, is_active: e.target.checked }); await product.reload(); } catch (err) { toast.error(errorMessage(err)); } }} />
                  <button type="button" className="rounded-xl p-2 text-rose-700 hover:bg-rose-50" aria-label={`Eliminar ${t.name}`}
                    onClick={async () => { try { await deleteTemplate(t.id); await product.reload(); } catch (e) { toast.error(errorMessage(e)); } }}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 md:grid-cols-[1fr_2fr_140px_auto] md:items-end">
            <InputField label="Nombre" value={tpl.name} maxLength={80} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} />
            <InputField label="Descripción" value={tpl.description} onChange={(e) => setTpl({ ...tpl, description: e.target.value })} />
            <InputField label="Recargo (Bs)" type="number" min={0} step="0.01" value={tpl.extra_price} onChange={(e) => setTpl({ ...tpl, extra_price: e.target.value })} />
            <Button variant="secondary" onClick={addTemplate}>Agregar</Button>
          </div>
        </section>
      )}

      <ConfirmDialog open={confirmDelete} title="Eliminar producto" danger confirmLabel="Eliminar"
        message="Si el producto ya figura en pedidos no podrá eliminarse; en ese caso despublíquelo." onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try { await deleteProduct(id as string); toast.success('Producto eliminado.'); navigate('/admin/productos'); }
          catch (e) { toast.error(errorMessage(e)); setConfirmDelete(false); }
        }} />
    </div>
  );
}
