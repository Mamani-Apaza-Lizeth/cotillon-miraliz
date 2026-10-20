import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ErrorState, PageHeader, Spinner } from '../../components/ui/Feedback';
import { Checkbox, InputField } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { deleteSupplier, listSuppliers, saveSupplier } from '../../services/inventory';
import { errorMessage } from '../../lib/errors';
import type { Supplier } from '../../types/db';

export function AdminSuppliersPage() {
  const toast = useToast();
  const suppliers = useAsync(listSuppliers, []);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });

  const create = async () => {
    if (form.name.trim().length < 2) { toast.warning('Ingrese el nombre.'); return; }
    try {
      await saveSupplier({ name: form.name.trim(), phone: form.phone.trim() || null, notes: form.notes.trim(), is_active: true });
      setForm({ name: '', phone: '', notes: '' });
      await suppliers.reload();
      toast.success('Proveedor agregado.');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const update = async (s: Supplier, patch: Partial<Supplier>) => {
    try {
      await saveSupplier({ name: s.name, phone: s.phone, notes: s.notes, is_active: s.is_active, ...patch }, s.id);
      await suppliers.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader title="Proveedores" subtitle="Se asocian a los materiales para saber a quién reponer." />
      <section className="card mb-6 grid gap-3 p-4 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
        <InputField label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <InputField label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <InputField label="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <Button onClick={create}>Agregar</Button>
      </section>
      {suppliers.loading && !suppliers.data && <Spinner />}
      {suppliers.error && <ErrorState message={suppliers.error} onRetry={suppliers.reload} />}
      {suppliers.data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nombre</th><th>Teléfono</th><th>Notas</th><th>Activo</th><th /></tr></thead>
            <tbody>
              {suppliers.data.map((s) => (
                <tr key={s.id}>
                  <td><input className="input py-1" defaultValue={s.name} aria-label="Nombre" onBlur={(e) => e.target.value.trim() !== s.name && update(s, { name: e.target.value.trim() })} /></td>
                  <td><input className="input py-1" defaultValue={s.phone ?? ''} aria-label="Teléfono" onBlur={(e) => e.target.value !== (s.phone ?? '') && update(s, { phone: e.target.value || null })} /></td>
                  <td><input className="input py-1" defaultValue={s.notes} aria-label="Notas" onBlur={(e) => e.target.value !== s.notes && update(s, { notes: e.target.value })} /></td>
                  <td><Checkbox label="" aria-label={`Activo ${s.name}`} checked={s.is_active} onChange={(e) => update(s, { is_active: e.target.checked })} /></td>
                  <td><button type="button" className="rounded-xl p-2 text-rose-700 hover:bg-rose-50" aria-label={`Eliminar ${s.name}`}
                    onClick={async () => { try { await deleteSupplier(s.id); await suppliers.reload(); } catch (e) { toast.error(errorMessage(e)); } }}><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {suppliers.data.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-ink-500">Sin proveedores.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
