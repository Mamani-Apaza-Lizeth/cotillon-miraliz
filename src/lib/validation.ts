// Esquemas de validación de formularios (primera barrera, en el navegador).
// La validación definitiva la repiten las restricciones y funciones de PostgreSQL.
import { z } from 'zod';

const phone = z
  .string()
  .trim()
  .regex(/^[0-9+ ()-]{6,20}$/, 'Ingrese un teléfono válido (solo números, 6 a 20 caracteres).');

export const loginSchema = z.object({
  email: z.string().trim().email('Ingrese un correo válido.'),
  password: z.string().min(1, 'Ingrese su contraseña.'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, 'Ingrese su nombre completo.').max(120),
    email: z.string().trim().email('Ingrese un correo válido.'),
    phone: phone.or(z.literal('')),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .regex(/[A-Za-z]/, 'Incluya al menos una letra.')
      .regex(/[0-9]/, 'Incluya al menos un número.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Las contraseñas no coinciden.', path: ['confirm'] });

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .regex(/[A-Za-z]/, 'Incluya al menos una letra.')
      .regex(/[0-9]/, 'Incluya al menos un número.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Las contraseñas no coinciden.', path: ['confirm'] });

export const profileSchema = z.object({
  fullName: z.string().trim().min(3, 'Ingrese su nombre completo.').max(120),
  phone: phone.or(z.literal('')),
});

export const quoteRequestSchema = z.object({
  quantity: z.coerce.number().int('Ingrese un número entero.').min(1, 'Mínimo 1.').max(1000, 'Máximo 1000.'),
  description: z.string().trim().min(10, 'Describa el trabajo (mínimo 10 caracteres).').max(2000),
  theme: z.string().trim().max(120).optional(),
  colors: z.string().trim().max(120).optional(),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Seleccione una fecha.'),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres.').max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones.'),
  description: z.string().max(2000),
  category_id: z.string().uuid('Seleccione una categoría.'),
  product_type: z.enum(['reventa', 'personalizado']),
  sale_unit: z.enum(['unidad', 'paquete', 'caja', 'docena', 'juego', 'metro']),
  units_per_sale: z.coerce.number().int().min(1),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo.').nullable(),
  min_order_qty: z.coerce.number().int().min(1),
  allows_custom_design: z.boolean(),
  is_published: z.boolean(),
  is_featured: z.boolean(),
}).refine((p) => !p.is_published || p.price !== null, { message: 'Un producto publicado debe tener precio.', path: ['price'] })
  .refine((p) => !p.allows_custom_design || p.product_type === 'personalizado', {
    message: 'Solo los productos personalizados aceptan diseño propio.', path: ['allows_custom_design'],
  });

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Valida tipo y tamaño de imagen antes de subirla (Storage vuelve a validarlo). */
export function validateImageFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Formato no permitido. Use JPG, PNG o WEBP.';
  }
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen supera 5 MB.';
  if (file.size === 0) return 'El archivo está vacío.';
  return null;
}

/** Devuelve el primer mensaje de error por campo de un resultado de zod. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
