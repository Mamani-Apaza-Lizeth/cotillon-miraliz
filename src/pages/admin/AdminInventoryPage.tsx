// Inventario: existencias, reservas, stock mínimo, ingresos, ajustes y movimientos.
import { useState } from 'react';
import { History, PackagePlus, Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge, ErrorState, PageHeader, Spinner } from '../../components/ui/Feedback';
import { Checkbox, InputField, SelectField, TextAreaField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import {
  adjustStock, createMaterial, isLowStock, listMovements, listStockItems, listSuppliers, receiveStock, updateStockItem, type MaterialInput,
} from '../../services/inventory';
import { errorMessage } from '../../lib/errors';
import { formatDateTime, formatMoney, formatQty, MEASURE_UNIT_LABEL, MOVEMENT_LABEL } from '../../lib/format';
import type { InventoryMovement, MeasureUnit, StockItem } from '../../types/db';

const UNITS = Object.keys(MEASURE_UNIT_LABEL) as MeasureUnit[];
const EMPTY_MATERIAL: MaterialInput = { name: '', unit: 'unidad', min_stock: 0, ref_cost: null, supplier_id: null, is_active: true };

export function AdminInventoryPage() {
  const toast = useToast();
  const items = useAsync(listStockItems, []);
  const suppliers = useAsync(listSuppliers, []);
  const [tab, setTab] = useState<'material' | 'producto'>('material');
  const [onlyLow, setOnlyLow] = useState(false);
  const [action, setAction] = useState<{ item: StockItem; type: 'entrada' | 'ajuste' } | null>(null);
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [material, setMaterial] = useState<{ open: boolean; id?: string; data: MaterialInput }>({ open: false, data: EMPTY_MATERIAL });
  const [moves, setMoves] = useState<{ item: StockItem; rows: InventoryMovement[] } | null>(null);

  const list = (items.data ?? []).filter((i) => i.kind === tab && (!onlyLow || isLowStock(i)));

  const submitAction = async () => {
    if (!action) return;
    const n = Number(qty);
    if (!n || (action.type === 'entrada' && n <= 0)) { toast.warning('Ingrese una cantidad válida.'); return; }
    setBusy(true);
    try {
      if (action.type === 'entrada') await receiveStock(action.item.id, n, cost === '' ? null : Number(cost), reason.trim());
      else await adjustStock(action.item.id, n, reason.trim());
      toast.success(action.type === 'entrada' ? 'Ingreso registrado.' : 'Ajuste registrado.');
      setAction(null);
      await items.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const saveMaterial = async () => {
    const d = material.data;
    if (d.name.trim().length < 2) { toast.warning('Ingrese el nombre del material.'); return; }
    setBusy(true);
    try {
      if (material.id) await updateStockItem(material.id, { ...d, name: d.name.trim() });
      else await createMaterial({ ...d, name: d.name.trim() });
      toast.success('Material guardado.');
      setMaterial({ open: false, data: EMPTY_MATERIAL });
      await items.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const showMoves = async (item: StockItem) => {
    try { setMoves({ item, rows: await listMovements(item.id) }); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div>
      <PageHeader title="Inventario" subtitle="Las cantidades cambian solo mediante ingresos, ajustes con motivo y pedidos; todo queda registrado."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setMaterial({ open: true, data: EMPTY_MATERIAL })}>Nuevo material</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-2xl bg-ink-100 p-1">
          <Button size="sm" variant={tab === 'material' ? 'primary' : 'ghost'} onClick={() => setTab('material')}>Materias primas</Button>
          <Button size="sm" variant={tab === 'producto' ? 'primary' : 'ghost'} onClick={() => setTab('producto')}>Productos terminados</Button>
        </div>
        <Checkbox label="Solo stock bajo" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
      </div>
      {items.loading && !items.data && <Spinner />}
      {items.error && <ErrorState message={items.error} onRetry={items.reload} />}
      {items.data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nombre</th><th>Existencia</th><th>Reservado</th><th>Disponible</th><th>Mínimo</th><th>Costo ref.</th><th>Acciones</th></tr></thead>
            <tbody>
              {list.map((i) => {
                const avail = Number(i.quantity) - Number(i.reserved);
                const unit = MEASURE_UNIT_LABEL[i.unit];
                return (
                  <tr key={i.id} className={!i.is_active ? 'opacity-50' : ''}>
                    <td className="font-bold">{i.name} {isLowStock(i) && <Badge tone="red">Stock bajo</Badge>} {i.is_demo && <Badge>demo</Badge>}</td>
                    <td>{formatQty(i.quantity)} {unit}</td>
                    <td>{formatQty(i.reserved)}</td>
                    <td className="font-bold">{formatQty(avail)}</td>
                    <td>{formatQty(i.min_stock)}</td>
                    <td>{i.ref_cost !== null ? formatMoney(i.ref_cost) : '—'}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="secondary" icon={<PackagePlus className="h-4 w-4" />} onClick={() => { setAction({ item: i, type: 'entrada' }); setQty(''); setCost(i.ref_cost?.toString() ?? ''); setReason(''); }}>Ingreso</Button>
                        <Button size="sm" variant="ghost" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => { setAction({ item: i, type: 'ajuste' }); setQty(''); setReason(''); }}>Ajuste</Button>
                        <Button size="sm" variant="ghost" icon={<History className="h-4 w-4" />} onClick={() => showMoves(i)}>Movimientos</Button>
                        <Button size="sm" variant="ghost" onClick={() => setMaterial({ open: true, id: i.id, data: { name: i.name, unit: i.unit, min_stock: Number(i.min_stock), ref_cost: i.ref_cost, supplier_id: i.supplier_id, is_active: i.is_active } })}>Editar</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-ink-500">Sin registros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!action} title={action ? `${action.type === 'entrada' ? 'Ingreso' : 'Ajuste'} · ${action.item.name}` : ''} onClose={() => setAction(null)}
        footer={<><Button variant="secondary" onClick={() => setAction(null)}>Cancelar</Button><Button loading={busy} onClick={submitAction}>Registrar</Button></>}>
        {action && (
          <div className="space-y-3">
            <p className="text-sm text-ink-500">Existencia: {formatQty(action.item.quantity)} · Reservado: {formatQty(action.item.reserved)} {MEASURE_UNIT_LABEL[action.item.unit]}</p>
            <InputField label={action.type === 'entrada' ? 'Cantidad recibida' : 'Cantidad a ajustar (+ suma, − resta)'} type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} />
            {action.type === 'entrada' && <InputField label="Costo unitario (Bs, opcional)" type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />}
            <TextAreaField label={action.type === 'ajuste' ? 'Motivo del ajuste (obligatorio)' : 'Nota (proveedor, factura…)'} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
            {action.type === 'ajuste' && <p className="text-xs text-ink-500">Un ajuste negativo no puede afectar unidades reservadas para pedidos.</p>}
          </div>
        )}
      </Modal>

      <Modal open={material.open} title={material.id ? 'Editar ítem' : 'Nuevo material'} onClose={() => setMaterial({ open: false, data: EMPTY_MATERIAL })}
        footer={<><Button variant="secondary" onClick={() => setMaterial({ open: false, data: EMPTY_MATERIAL })}>Cancelar</Button><Button loading={busy} onClick={saveMaterial}>Guardar</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField label="Nombre" wrapperClassName="sm:col-span-2" value={material.data.name} onChange={(e) => setMaterial({ ...material, data: { ...material.data, name: e.target.value } })} />
          <SelectField label="Unidad de medida" value={material.data.unit} onChange={(e) => setMaterial({ ...material, data: { ...material.data, unit: e.target.value as MeasureUnit } })}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </SelectField>
          <InputField label="Stock mínimo" type="number" min={0} step="0.001" value={material.data.min_stock} onChange={(e) => setMaterial({ ...material, data: { ...material.data, min_stock: Number(e.target.value) || 0 } })} />
          <InputField label="Costo de referencia (Bs)" type="number" min={0} step="0.01" value={material.data.ref_cost ?? ''} onChange={(e) => setMaterial({ ...material, data: { ...material.data, ref_cost: e.target.value === '' ? null : Number(e.target.value) } })} />
          <SelectField label="Proveedor" value={material.data.supplier_id ?? ''} onChange={(e) => setMaterial({ ...material, data: { ...material.data, supplier_id: e.target.value || null } })}>
            <option value="">—</option>
            {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </SelectField>
          <Checkbox label="Activo" checked={material.data.is_active} onChange={(e) => setMaterial({ ...material, data: { ...material.data, is_active: e.target.checked } })} />
        </div>
      </Modal>

      <Modal open={!!moves} title={`Movimientos · ${moves?.item.name ?? ''}`} size="lg" onClose={() => setMoves(null)}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Existencia / reservado después</th><th>Motivo</th></tr></thead>
            <tbody>
              {moves?.rows.map((m) => (
                <tr key={m.id}>
                  <td>{formatDateTime(m.created_at)}</td>
                  <td>{MOVEMENT_LABEL[m.movement_type]}</td>
                  <td>{formatQty(m.quantity)}</td>
                  <td>{formatQty(m.quantity_after)} / {formatQty(m.reserved_after)}</td>
                  <td>{m.reason}{m.unit_cost !== null ? ` · ${formatMoney(m.unit_cost)} c/u` : ''}</td>
                </tr>
              ))}
              {moves?.rows.length === 0 && <tr><td colSpan={5} className="text-center text-ink-500">Sin movimientos.</td></tr>}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
