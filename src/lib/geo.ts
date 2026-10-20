// Utilidades geográficas. El cálculo OFICIAL de distancia y tarifa lo hace la
// base de datos (delivery_quote); estas funciones solo sirven para la vista previa
// y deben producir el mismo resultado (fórmula de Haversine, línea recta).
import type { DeliverySettings } from '../types/db';

export const LA_PAZ_CENTER: [number, number] = [-16.4955, -68.1336];
/** Rectángulo aproximado del área urbana La Paz – El Alto para acotar búsquedas. */
export const LA_PAZ_VIEWBOX = { west: -68.25, north: -16.42, east: -68.0, south: -16.6 };

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function previewDeliveryFee(cfg: DeliverySettings, lat: number, lng: number) {
  const km = haversineKm(cfg.origin_lat, cfg.origin_lng, lat, lng);
  let fee = Math.round((cfg.base_fee + cfg.per_km_fee * km) * 100) / 100;
  if (cfg.min_fee !== undefined && cfg.min_fee !== null) fee = Math.max(fee, cfg.min_fee);
  return { distanceKm: Math.round(km * 100) / 100, fee, withinCoverage: km <= cfg.max_km };
}

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

const geocodeCache = new Map<string, GeocodeResult[]>();
let lastGeocodeAt = 0;

/**
 * Búsqueda de direcciones con Nominatim (OpenStreetMap). Política de uso:
 * máximo 1 solicitud por segundo, sin autocompletado, con caché y atribución.
 * Solo se llama cuando el usuario pulsa "Buscar".
 */
export async function geocodeLaPaz(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const key = q.toLowerCase();
  const cached = geocodeCache.get(key);
  if (cached) return cached;

  const wait = 1100 - (Date.now() - lastGeocodeAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocodeAt = Date.now();

  const { west, north, east, south } = LA_PAZ_VIEWBOX;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', `${q}, La Paz, Bolivia`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '5');
  url.searchParams.set('countrycodes', 'bo');
  url.searchParams.set('viewbox', `${west},${north},${east},${south}`);
  url.searchParams.set('bounded', '1');
  url.searchParams.set('accept-language', 'es');

  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('El servicio de búsqueda de direcciones no respondió. Ubique el punto manualmente en el mapa.');
  const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  const results = data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
  geocodeCache.set(key, results);
  return results;
}
