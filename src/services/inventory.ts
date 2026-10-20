// Inventario de productos terminados y materias primas, proveedores y movimientos.
// Las cantidades SOLO cambian mediante RPC (admin_receive_stock / admin_adjust_stock
// y los flujos de pedidos), nunca con un UPDATE directo.
import { supabase } from '../lib/supabase';
import type { InventoryMovement, MaterialCheckRow, MeasureUnit, StockItem, Supplier } from '../types/db';

export async function listStockItems(): Promise<StockItem[]> {
  const { data, error } = await supabase.from('stock_items').select('*').order('kind').order('name');
  if (error) throw error;
  return data as StockItem[];
}

export async function listMovements(stockItemId?: string, limit = 100): Promise<InventoryMovement[]> {
  let q = supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(limit);
  if (stockItemId) q = q.eq('stock_item_id', stockItemId);
  const { data, error } = await q;
  if (error) throw error;
  return data as InventoryMovement[];
}

export interface MaterialInput {
  name: string;
  unit: MeasureUnit;
  min_stock: number;
  ref_cost: number | null;
  supplier_id: string | null;
  is_active: boolean;
}

export async function createMaterial(input: MaterialInput): Promise<void> {
  const { error } = await supabase.from('stock_items').insert({ kind: 'material', ...input });
  if (error) throw error;
}

export async function updateStockItem(id: string, input: Partial<MaterialInput>): Promise<void> {
  const { error } = await supabase.from('stock_items').update(input).eq('id', id);
  if (error) throw error;
}

export async function receiveStock(id: string, quantity: number, unitCost: number | null, note: string): Promise<void> {
  const { error } = await supabase.rpc('admin_receive_stock', {
    p_item: id, p_quantity: quantity, p_unit_cost: unitCost, p_note: note,
  });
  if (error) throw error;
}

export async function adjustStock(id: string, delta: number, reason: string): Promise<void> {
  const { error } = await supabase.rpc('admin_adjust_stock', { p_item: id, p_delta: delta, p_reason: reason });
  if (error) throw error;
}

export async function materialCheck(productId: string, quantity: number): Promise<MaterialCheckRow[]> {
  const { data, error } = await supabase.rpc('material_check', { p_product: productId, p_quantity: quantity });
  if (error) throw error;
  return (data ?? []) as MaterialCheckRow[];
}

export function isLowStock(item: Pick<StockItem, 'quantity' | 'reserved' | 'min_stock'>): boolean {
  return Number(item.quantity) - Number(item.reserved) <= Number(item.min_stock);
}

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select('*').order('name');
  if (error) throw error;
  return data as Supplier[];
}

export async function saveSupplier(s: Pick<Supplier, 'name' | 'phone' | 'notes' | 'is_active'>, id?: string): Promise<void> {
  const { error } = id
    ? await supabase.from('suppliers').update(s).eq('id', id)
    : await supabase.from('suppliers').insert(s);
  if (error) throw error;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw error;
}
