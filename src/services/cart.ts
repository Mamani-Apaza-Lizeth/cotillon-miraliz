// Carrito persistente en la tabla cart_items (RLS: cada usuario solo ve el suyo).
// El carrito NO guarda precios: al confirmar, place_order los recalcula en el servidor.
import { supabase } from '../lib/supabase';
import type { CustomizationTemplate, Product, ProductImage } from '../types/db';

export interface CartLine {
  id: string;
  product_id: string;
  template_id: string | null;
  quantity: number;
  notes: string;
  products: Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'sale_unit' | 'product_type' | 'is_published' | 'min_order_qty'> & {
    product_images: Pick<ProductImage, 'storage_path' | 'sort_order'>[];
  };
  customization_templates: Pick<CustomizationTemplate, 'id' | 'name' | 'extra_price'> | null;
}

export async function listCart(): Promise<CartLine[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, product_id, template_id, quantity, notes, products(id, name, slug, price, sale_unit, product_type, is_published, min_order_qty, product_images(storage_path, sort_order)), customization_templates(id, name, extra_price)')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as unknown as CartLine[];
}

export function lineUnitPrice(line: CartLine): number {
  return Number(line.products.price ?? 0) + Number(line.customization_templates?.extra_price ?? 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return Math.round(lines.reduce((s, l) => s + lineUnitPrice(l) * l.quantity, 0) * 100) / 100;
}

export async function addToCart(userId: string, productId: string, quantity: number, templateId: string | null, notes = ''): Promise<void> {
  let query = supabase.from('cart_items').select('id, quantity').eq('product_id', productId);
  query = templateId ? query.eq('template_id', templateId) : query.is('template_id', null);
  const { data: existing, error: findError } = await query.maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: Math.min(1000, existing.quantity + quantity), notes })
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('cart_items')
    .insert({ user_id: userId, product_id: productId, template_id: templateId, quantity, notes });
  if (error) throw error;
}

export async function updateCartQuantity(lineId: string, quantity: number): Promise<void> {
  const { error } = await supabase.from('cart_items').update({ quantity }).eq('id', lineId);
  if (error) throw error;
}

export async function removeCartLine(lineId: string): Promise<void> {
  const { error } = await supabase.from('cart_items').delete().eq('id', lineId);
  if (error) throw error;
}

export async function countCart(): Promise<number> {
  const { data, error } = await supabase.from('cart_items').select('quantity');
  if (error) throw error;
  return (data ?? []).reduce((s, r: { quantity: number }) => s + r.quantity, 0);
}
