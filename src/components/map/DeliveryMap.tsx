// Mapa interactivo (Leaflet + OpenStreetMap) para elegir el punto de entrega en La Paz.
// Clic o arrastre del marcador para ajustar; búsqueda por texto con botón (sin autocompletado,
// según la política de uso de Nominatim).
import { useEffect, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search } from 'lucide-react';
import { geocodeLaPaz, LA_PAZ_CENTER, type GeocodeResult } from '../../lib/geo';
import { Button } from '../ui/Button';

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:34px;height:34px;transform:translate(-17px,-34px)"><svg viewBox="0 0 24 24" width="34" height="34"><path fill="#d6246e" stroke="#fff" stroke-width="1.5" d="M12 2C7.6 2 4 5.5 4 9.9 4 15.4 12 22 12 22s8-6.6 8-12.1C20 5.5 16.4 2 12 2z"/><circle cx="12" cy="10" r="3.2" fill="#fff"/></svg></div>',
  iconSize: [0, 0],
});
const storeIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;transform:translate(-14px,-14px);border-radius:999px;background:#f5b700;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
  iconSize: [0, 0],
});

interface Props {
  value: { lat: number; lng: number } | null;
  onChange: (pos: { lat: number; lng: number }, label?: string) => void;
  origin?: { lat: number; lng: number } | null;
  coverageKm?: number;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [target, map]);
  return null;
}

export function DeliveryMap({ value, onChange, origin, coverageKm }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);

  const search = async () => {
    setSearching(true);
    setSearchError(null);
    try {
      const r = await geocodeLaPaz(query);
      setResults(r);
      if (r.length === 0) setSearchError('No se encontraron coincidencias. Marque el punto directamente en el mapa.');
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'No se pudo buscar la dirección.');
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Su navegador no permite obtener la ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        onChange(pos);
        setFlyTarget(pos);
      },
      () => setSearchError('No se pudo obtener su ubicación. Verifique los permisos del navegador.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="map-search" className="sr-only">Buscar dirección</label>
        <input id="map-search" className="input flex-1" placeholder="Calle, zona o referencia (ej.: Av. Arce, Sopocachi)"
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }} />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={search} loading={searching} disabled={query.trim().length < 3} icon={<Search className="h-4 w-4" />}>Buscar</Button>
          <Button variant="ghost" onClick={useMyLocation} icon={<LocateFixed className="h-4 w-4" />} title="Usar mi ubicación">Mi ubicación</Button>
        </div>
      </div>
      {searchError && <p className="text-sm text-amber-700" role="status">{searchError}</p>}
      {results.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-xl border border-ink-100 bg-white text-sm">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button type="button" className="w-full px-3 py-2 text-left hover:bg-brand-50"
                onClick={() => { onChange({ lat: r.lat, lng: r.lng }, r.label); setFlyTarget({ lat: r.lat, lng: r.lng }); setResults([]); }}>
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="h-72 overflow-hidden rounded-2xl border-2 border-ink-100 sm:h-80">
        <MapContainer center={value ? [value.lat, value.lng] : LA_PAZ_CENTER} zoom={value ? 15 : 13} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <ClickHandler onPick={(lat, lng) => onChange({ lat, lng })} />
          <FlyTo target={flyTarget} />
          {origin && <Marker position={[origin.lat, origin.lng]} icon={storeIcon} title="Tienda" />}
          {origin && coverageKm ? (
            <Circle center={[origin.lat, origin.lng]} radius={coverageKm * 1000}
              pathOptions={{ color: '#17b890', weight: 1, fillOpacity: 0.05 }} />
          ) : null}
          {value && (
            <Marker position={[value.lat, value.lng]} icon={pinIcon} draggable title="Punto de entrega"
              eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onChange({ lat: ll.lat, lng: ll.lng }); } }} />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-ink-500">Toque el mapa para colocar el marcador y arrástrelo para ajustarlo. El círculo verde muestra el área de cobertura.</p>
    </div>
  );
}
