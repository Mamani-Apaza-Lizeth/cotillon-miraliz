// Pruebas unitarias de utilidades y reglas puras.
import { describe, expect, it } from 'vitest';
import { addDays, formatMinutes, formatMoney, parseDateOnly, slugify, todayInLaPaz } from './format';
import { haversineKm, previewDeliveryFee } from './geo';
import { adminNextStatuses, canTransition, timelineSteps } from './orderStatus';
import { availabilityLabel, cardErrorMessage, lineProblem, qrPhaseFromStatus, recipeEstimatedCost, safeNext } from './rules';
import { loginSchema, productSchema, registerSchema, validateImageFile } from './validation';
import { errorMessage, toAppError } from './errors';
import { EnvError, readPublicEnv } from './env';
import { newIdempotencyKey } from './idempotency';
import { sanitizeSearch } from '../services/catalog';
import { cartSubtotal, type CartLine } from '../services/cart';
import type { DeliverySettings } from '../types/db';

describe('formatos', () => {
  it('formatea bolivianos con dos decimales', () => {
    expect(formatMoney(1234.5)).toMatch(/^Bs 1.?234,50$/);
    expect(formatMoney(null)).toBe('—');
  });
  it('maneja fechas sin desplazar el día por la zona horaria', () => {
    const d = parseDateOnly('2026-10-20');
    expect(d.getDate()).toBe(20);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('calcula "hoy" en La Paz (UTC−4)', () => {
    // 2026-10-21 02:00 UTC = 2026-10-20 22:00 en La Paz
    expect(todayInLaPaz(new Date('2026-10-21T02:00:00Z'))).toBe('2026-10-20');
  });
  it('expresa minutos en horas', () => {
    expect(formatMinutes(150)).toBe('2 h 30 min');
    expect(formatMinutes(45)).toBe('45 min');
  });
  it('genera identificadores de URL válidos', () => {
    expect(slugify('Piñata 2D ¡Dinosaurio!')).toBe('pinata-2d-dinosaurio');
  });
});

describe('entregas', () => {
  const cfg: DeliverySettings = { enabled: true, origin_lat: -16.4955, origin_lng: -68.1336, base_fee: 10, per_km_fee: 3, min_fee: 10, max_km: 12 };
  it('distancia de Haversine coherente con la base de datos', () => {
    // La prueba T18 de la base de datos informa 196.72 km para este punto.
    expect(haversineKm(cfg.origin_lat, cfg.origin_lng, -17.97, -67.11)).toBeCloseTo(196.72, 1);
  });
  it('tarifa = base + km × tarifa por km, con cobertura', () => {
    const near = previewDeliveryFee(cfg, -16.5, -68.12);
    expect(near.withinCoverage).toBe(true);
    expect(near.fee).toBeCloseTo(10 + 3 * near.distanceKm, 1);
    expect(previewDeliveryFee(cfg, -17.97, -67.11).withinCoverage).toBe(false);
    expect(previewDeliveryFee(cfg, cfg.origin_lat, cfg.origin_lng).fee).toBe(10);
  });
});

describe('estados de pedido', () => {
  it('replica las transiciones de la base de datos', () => {
    expect(canTransition('pendiente_pago', 'confirmado')).toBe(true);
    expect(canTransition('entregado', 'listo')).toBe(false);
    expect(canTransition('cotizacion_pendiente', 'pendiente_pago')).toBe(false);
  });
  it('"en camino" solo para entregas a domicilio', () => {
    expect(adminNextStatuses('listo', 'recojo')).toEqual(['entregado']);
    expect(adminNextStatuses('listo', 'entrega')).toEqual(['en_camino', 'entregado']);
  });
  it('línea de tiempo según tipo de pedido', () => {
    expect(timelineSteps(true, 'entrega')[0]).toBe('cotizacion_pendiente');
    expect(timelineSteps(false, 'recojo')).not.toContain('en_camino');
  });
});

describe('reglas de interfaz', () => {
  it('etiqueta de disponibilidad', () => {
    expect(availabilityLabel({ product_type: 'personalizado' }, null).text).toBe('Hecho a pedido');
    expect(availabilityLabel({ product_type: 'reventa' }, 0).text).toBe('Agotado');
    expect(availabilityLabel({ product_type: 'reventa' }, 3).text).toBe('Últimas 3');
    expect(availabilityLabel({ product_type: 'reventa' }, 30).tone).toBe('green');
  });

  const line = (over: Partial<CartLine['products']>, quantity = 2): CartLine => ({
    id: 'l', product_id: 'p', template_id: null, quantity, notes: '',
    products: { id: 'p', name: 'Globos', slug: 'globos', price: 10, sale_unit: 'paquete', product_type: 'reventa', is_published: true, min_order_qty: 1, product_images: [], ...over },
    customization_templates: null,
  });
  it('detecta problemas del carrito antes de confirmar', () => {
    expect(lineProblem(line({}), 5)).toBeNull();
    expect(lineProblem(line({}, 6), 5)).toBe('Solo hay 5 disponibles.');
    expect(lineProblem(line({ is_published: false }), 5)).toMatch(/no está disponible/);
    expect(lineProblem(line({ min_order_qty: 3 }), 5)).toMatch(/mínima es 3/);
    expect(lineProblem(line({ product_type: 'personalizado' }, 50), undefined)).toBeNull();
  });
  it('subtotal del carrito incluye recargos de plantilla', () => {
    const l = line({}, 3);
    l.customization_templates = { id: 't', name: 'T', extra_price: 2 };
    expect(cartSubtotal([l, line({}, 1)])).toBe(46);
  });
  it('costo estimado de receta por unidad', () => {
    const recipe = { yield_qty: 2, recipe_materials: [{ recipe_id: 'r', stock_item_id: 'a', quantity: 1 }, { recipe_id: 'r', stock_item_id: 'b', quantity: 4 }] };
    expect(recipeEstimatedCost(recipe, new Map([['a', 15], ['b', 1]]))).toBe(9.5);
    expect(recipeEstimatedCost(recipe, new Map([['a', 15], ['b', null]]))).toBeNull();
  });
  it('evita redirecciones abiertas', () => {
    expect(safeNext('/mis-pedidos')).toBe('/mis-pedidos');
    expect(safeNext('//malicioso.com')).toBe('/');
    expect(safeNext('https://malicioso.com')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
  it('mensajes de tarjeta de prueba', () => {
    expect(cardErrorMessage('card_declined', 'insufficient_funds')).toBe('Fondos insuficientes en la tarjeta.');
    expect(cardErrorMessage('card_declined', 'generic_decline')).toBe('La tarjeta fue rechazada.');
    expect(cardErrorMessage('incorrect_number')).toBe('El número de tarjeta no es válido.');
  });
  it('el QR solo se muestra como verificado si la BD dice aprobado', () => {
    expect(qrPhaseFromStatus('pendiente')).toBe('esperando');
    expect(qrPhaseFromStatus('aprobado')).toBe('verificado');
    expect(qrPhaseFromStatus('expirado')).toBe('expirado');
    expect(qrPhaseFromStatus('fallido')).toBe('rechazado');
  });
});

describe('validaciones', () => {
  it('registro exige contraseña segura y coincidente', () => {
    expect(registerSchema.safeParse({ fullName: 'Ana Pérez', email: 'ana@x.com', phone: '', password: 'abc12345', confirm: 'abc12345' }).success).toBe(true);
    expect(registerSchema.safeParse({ fullName: 'Ana', email: 'ana@x.com', phone: '', password: 'abcdefgh', confirm: 'abcdefgh' }).success).toBe(false);
    expect(registerSchema.safeParse({ fullName: 'Ana', email: 'ana@x.com', phone: '', password: 'abc12345', confirm: 'otra1234' }).success).toBe(false);
  });
  it('login exige correo válido', () => {
    expect(loginSchema.safeParse({ email: 'no-es-correo', password: 'x' }).success).toBe(false);
  });
  it('producto publicado requiere precio', () => {
    const base = { name: 'Vela', slug: 'vela', description: '', category_id: '6f1c2a2e-3a5b-4c8d-9e0f-1a2b3c4d5e6f', product_type: 'reventa', sale_unit: 'unidad',
      units_per_sale: 1, min_order_qty: 1, allows_custom_design: false, is_featured: false };
    expect(productSchema.safeParse({ ...base, price: null, is_published: true }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, price: 5, is_published: true }).success).toBe(true);
    expect(productSchema.safeParse({ ...base, price: 5, is_published: false, allows_custom_design: true }).success).toBe(false);
  });
  it('valida tipo y tamaño de imágenes', () => {
    expect(validateImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
    expect(validateImageFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).toMatch(/Formato/);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'b.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(big)).toMatch(/5 MB/);
  });
  it('limpia la búsqueda para filtros de PostgREST', () => {
    expect(sanitizeSearch('globos,(rojos)*%')).toBe('globos rojos');
  });
});

describe('errores y configuración', () => {
  it('traduce errores técnicos', () => {
    expect(errorMessage({ message: 'permission denied for table orders', code: '42501' })).toBe('No tiene permiso para realizar esta operación.');
    expect(errorMessage({ message: 'Invalid login credentials' })).toBe('Correo o contraseña incorrectos.');
    expect(errorMessage(new TypeError('Failed to fetch'))).toMatch(/No se pudo conectar/);
  });
  it('conserva la fecha sugerida de la base de datos', () => {
    const e = toAppError({ message: 'La fecha solicitada no es viable.', code: 'P0001', hint: 'fecha_no_viable', details: '2026-10-25' });
    expect(e.hint).toBe('fecha_no_viable');
    expect(e.detail).toBe('2026-10-25');
  });
  it('rechaza claves secretas en variables públicas', () => {
    expect(() => readPublicEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' })).toThrow(EnvError);
    const fakeServiceJwt = `x.${btoa(JSON.stringify({ role: 'service_role' }))}.y`;
    expect(() => readPublicEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: fakeServiceJwt })).toThrow(EnvError);
    expect(() => readPublicEnv({ VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' })).toThrow(EnvError);
    expect(readPublicEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc', VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_1' }).stripePublishableKey).toBe('pk_test_1');
    expect(() => readPublicEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc', VITE_STRIPE_PUBLISHABLE_KEY: 'sk_test_1' })).toThrow(EnvError);
  });
  it('genera claves de idempotencia únicas', () => {
    const a = newIdempotencyKey('order');
    expect(a).toMatch(/^order-/);
    expect(a).not.toBe(newIdempotencyKey('order'));
  });
});
