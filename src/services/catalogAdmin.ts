// Gestión del catálogo (solo administrador; RLS lo impone en el servidor).
import { supabase } from '../lib/supabase';
import { removeProductImage, uploadProductImage } from '../lib/storage';
import type { Category, CustomizationTemplate, Product, ProductWithRelations } from '../types/db';

export type ProductInput = Pick<Product,
  'name' | 'slug' | 'description' | 'category_id' | 'product_type' | 'sale_unit' | 'units_per_sale' | 'price'
  | 'min_order_qty' | 'allows_custom_design' | 'is_published' | 'is_featured'>;

export async function listAllProducts(): Promise<ProductWithRelations[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name, slug), product_images(*)')
    .order('name');
  if (error) throw error;
  return data as ProductWithRelations[];
}

export async function getProductForEdit(id: string): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name, slug), product_images(*), customization_templates(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p = data as ProductWithRelations;
  p.product_images = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order);
  return p;
}

export async function saveProduct(input: ProductInput, id?: string): Promise<string> {
  if (id) {
    const { error } = await supabase.from('products').update(input).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from('products').insert(input).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function updateProductFlags(id: string, patch: Partial<Pick<Product, 'is_published' | 'is_featured'>>): Promise<void> {
  const { error } = await supabase.from('products').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function addProductImage(productId: string, file: File, alt: string, sortOrder: number): Promise<void> {
  const path = await uploadProductImage(productId, file);
  const { error } = await supabase.from('product_images').insert({
    product_id: productId, storage_path: path, alt_text: alt, sort_order: sortOrder,
  });
  if (error) {
    await removeProductImage(path).catch(() => undefined);
    throw error;
  }
}

export async function deleteProductImage(imageId: string, path: string): Promise<void> {
  const { error } = await supabase.from('product_images').delete().eq('id', imageId);
  if (error) throw error;
  await removeProductImage(path).catch(() => undefined);
}

export async function saveTemplate(t: Partial<CustomizationTemplate> & { product_id: string; name: string }): Promise<void> {
  const payload = {
    product_id: t.product_id, name: t.name, description: t.description ?? '',
    extra_price: t.extra_price ?? 0, is_active: t.is_active ?? true,
  };
  const { error } = t.id
    ? await supabase.from('customization_templates').update(payload).eq('id', t.id)
    : await supabase.from('customization_templates').insert(payload);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('customization_templates').delete().eq('id', id);
  if (error) throw error;
}

export async function listAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('name');
  if (error) throw error;
  return data as Category[];
}

export async function saveCategory(c: Pick<Category, 'name' | 'slug' | 'description' | 'sort_order' | 'is_active'>, id?: string): Promise<void> {
  const { error } = id
    ? await supabase.from('categories').update(c).eq('id', id)
    : await supabase.from('categories').insert(c);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}
