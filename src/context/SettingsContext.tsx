// Parámetros públicos del negocio (contacto, entregas, pagos, cancelación) leídos de app_settings.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getPublicSettings } from '../services/admin';
import type { PublicSettings } from '../types/db';

interface SettingsState {
  settings: PublicSettings | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setSettings(await getPublicSettings());
      setError(null);
    } catch {
      setError('No se pudo cargar la configuración de la tienda.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(() => ({ settings, loading, error, reload }), [settings, loading, error, reload]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de <SettingsProvider>.');
  return ctx;
}
