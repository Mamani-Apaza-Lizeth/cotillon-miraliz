// Sesión de Supabase Auth + perfil (rol) del usuario.
// El rol se lee de la tabla profiles (fuente confiable); la interfaz lo usa solo
// para mostrar u ocultar opciones. La autorización real la hacen RLS y las RPC.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getMyProfile, signOut as doSignOut } from '../services/account';
import type { AppRole, Profile } from '../types/db';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  /** true cuando el usuario llegó desde el enlace de recuperación de contraseña. */
  recovering: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await getMyProfile(s.user.id));
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(newSession);
      // Diferido para no llamar a Supabase dentro del callback de autenticación.
      setTimeout(() => {
        void loadProfile(newSession);
      }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthState>(() => ({
    session,
    profile,
    role: profile?.is_active ? profile.role : null,
    loading,
    recovering,
    refreshProfile: () => loadProfile(session),
    signOut: async () => {
      await doSignOut();
      setProfile(null);
      setRecovering(false);
    },
  }), [session, profile, loading, recovering, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
