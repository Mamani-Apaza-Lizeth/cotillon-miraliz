import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ErrorState, PageHeader, Spinner } from '../../components/ui/Feedback';
import { Checkbox, InputField } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { deleteCategory, listAllCategories, saveCategory } from '../../services/catalogAdmin';
import { errorMessage } from '../../lib/errors';
import { slugify } from '../../lib/format';
import type { Category } from '../../types/db';

export function AdminCategoriesPage() {
  const toast = useToast();
  const cats = useAsync(listAllCategories, []);
  const [form, setForm] = useState({ name: '', description: '', sort_order: '0' });

  const create = async () => {
    if (form.name.trim().length < 2) { toast.warning('Ingrese un nombre.'); return; }
    try {
      await saveCategory({ name: form.name.trim(), slug: slugify(form.name), description: form.description.trim(), sort_order: Number(form.sort_order) || 0, is_active: true });
      setForm({ name: '', description: '', sort_order: '0' });
      await cats.reload();
      toast.success('Categoría creada.');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const update = async (c: Category, patch: Partial<Category>) => {
    try {
      await saveCategory({ name: c.name, slug: c.slug, description: c.description, sort_order: c.sort_order, is_active: c.is_active, ...patch }, c.id);
      await cats.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader title="Categorías" />
      <section className="card mb-6 grid gap-3 p-4 md:grid-cols-[1fr_2fr_120px_auto] md:items-end">
        <InputField label="Nombre" value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <InputField label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <InputField label="Orden" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
        <Button onClick={create}>Agregar</Button>
      </section>
      {cats.loading && !cats.data && <Spinner />}
      {cats.error && <ErrorState message={cats.error} onRetry={cats.reload} />}
      {cats.data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nombre</th><th>Descripción</th><th>Orden</th><th>Activa</th><th /></tr></thead>
            <tbody>
              {cats.data.map((c) => (
                <tr key={c.id}>
                  <td><input className="input py-1" defaultValue={c.name} aria-label="Nombre" onBlur={(e) => e.target.value.trim() !== c.name && update(c, { name: e.target.value.trim() })} /></td>
                  <td><input className="input py-1" defaultValue={c.description} aria-label="Descripción" onBlur={(e) => e.target.value !== c.description && update(c, { description: e.target.value })} /></td>
                  <td className="w-24"><input type="number" className="input py-1" defaultValue={c.sort_order} aria-label="Orden" onBlur={(e) => Number(e.target.value) !== c.sort_order && update(c, { sort_order: Number(e.target.value) || 0 })} /></td>
                  <td><Checkbox label="" aria-label={`Activa ${c.name}`} checked={c.is_active} onChange={(e) => update(c, { is_active: e.target.checked })} /></td>
                  <td>
                    <button type="button" className="rounded-xl p-2 text-rose-700 hover:bg-rose-50" aria-label={`Eliminar ${c.name}`}
                      onClick={async () => { try { await deleteCategory(c.id); await cats.reload(); } catch (e) { toast.error(errorMessage(e) + ' Si tiene productos, desactívela.'); } }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
