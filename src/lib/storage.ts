// Subida y lectura de imágenes en Supabase Storage.
import { CUSTOMIZATION_BUCKET, PRODUCT_BUCKET, supabase } from './supabase';
import { validateImageFile } from './validation';

function extensionFor(file: File): string {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

function randomName(file: File): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
  return `${id}.${extensionFor(file)}`;
}

/** URL pública de una imagen del catálogo (bucket público). */
export function productImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Sube una imagen del catálogo (solo administrador; lo impone la política de Storage). */
export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);
  const path = `${productId}/${randomName(file)}`;
  const { error } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, file, {
    contentType: file.type, upsert: false, cacheControl: '3600',
  });
  if (error) throw error;
  return path;
}

export async function removeProductImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PRODUCT_BUCKET).remove([path]);
  if (error) throw error;
}

/** Sube un diseño de referencia del cliente a SU carpeta privada (<uid>/archivo). */
export async function uploadCustomization(userId: string, file: File): Promise<string> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);
  const path = `${userId}/${randomName(file)}`;
  const { error } = await supabase.storage.from(CUSTOMIZATION_BUCKET).upload(path, file, {
    contentType: file.type, upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeCustomization(path: string): Promise<void> {
  await supabase.storage.from(CUSTOMIZATION_BUCKET).remove([path]);
}

/** URL temporal (10 min) de un diseño privado; Storage verifica permisos con RLS. */
export async function customizationSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(CUSTOMIZATION_BUCKET).createSignedUrl(path, 600);
  if (error) return null;
  return data.signedUrl;
}
