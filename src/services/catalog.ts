// Catálogo público: categorías, productos, plantillas y disponibilidad.
import { supabase } from '../lib/supabase';
import type { Category, ProductWithRelations } from '../types/db';

export type CatalogSort = 'destacados' | 'precio_asc' | 'precio_desc' | 'nombre' | 'recientes';

export interface CatalogFilters {
  search?: string;
  categoryId?: string;
  type?: 'reventa' | 'personalizado' | '';
  sort?: CatalogSort;
  featuredOnly?: boolean;
  limit?: number;
}

const PRODUCT_SELECT = '*, categories(id, name, slug), product_images(id, product_id, storage_path, alt_text, sort_order)';

/** Elimina caracteres con significado especial en los filtros de PostgREST. */
export function sanitizeSearch(text: string): string {
  return text.replace(/[%,()*\\:"'.]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return data as Category[];
}

export async function listProducts(filters: CatalogFilters = {}): Promise<ProductWithRelations[]> {
  let query = supabase.from('products').select(PRODUCT_SELECT).eq('is_published', true);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.type) query = query.eq('product_type', filters.type);
  if (filters.featuredOnly) query = query.eq('is_featured', true);
  const term = filters.search ? sanitizeSearch(filters.search) : '';
  if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);

  switch (filters.sort ?? 'destacados') {
    case 'precio_asc': query = query.order('price', { ascending: true }); break;
    case 'precio_desc': query = query.order('price', { ascending: false }); break;
    case 'nombre': query = query.order('name'); break;
    case 'recientes': query = query.order('created_at', { ascending: false }); break;
    default: query = query.order('is_featured', { ascending: false }).order('name');
  }
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data as ProductWithRelations[]).map(sortImages);
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`${PRODUCT_SELECT}, customization_templates(*)`)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const product = sortImages(data as ProductWithRelations);
  product.customization_templates = (product.customization_templates ?? []).filter((t) => t.is_active);
  return product;
}

/** Disponibilidad por producto: número para reventa; null = se elabora a pedido. */
export async function getAvailability(): Promise<Map<string, number | null>> {
  const { data, error } = await supabase.rpc('catalog_availability');
  if (error) throw error;
  const map = new Map<string, number | null>();
  for (const row of (data ?? []) as Array<{ product_id: string; available: number | null }>) {
    map.set(row.product_id, row.available === null ? null : Number(row.available));
  }
  return map;
}

function sortImages(p: ProductWithRelations): ProductWithRelations {
  return { ...p, product_images: [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order) };
}
