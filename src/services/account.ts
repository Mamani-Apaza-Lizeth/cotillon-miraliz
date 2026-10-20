// Cuenta del usuario: perfil, direcciones y autenticación.
import { publicEnv, supabase } from '../lib/supabase';
import type { CustomerAddress, Profile } from '../types/db';

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

/** Solo nombre y teléfono: el rol y el estado no son editables por el usuario. */
export async function updateMyProfile(userId: string, fullName: string, phone: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ full_name: fullName, phone: phone || null }).eq('id', userId);
  if (error) throw error;
}

export async function listAddresses(): Promise<CustomerAddress[]> {
  const { data, error } = await supabase.from('customer_addresses').select('*').order('created_at');
  if (error) throw error;
  return data as CustomerAddress[];
}

export async function saveAddress(userId: string, a: Omit<CustomerAddress, 'id' | 'user_id'>, id?: string): Promise<void> {
  const payload = { ...a, user_id: userId };
  const { error } = id
    ? await supabase.from('customer_addresses').update(payload).eq('id', id)
    : await supabase.from('customer_addresses').insert(payload);
  if (error) throw error;
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from('customer_addresses').delete().eq('id', id);
  if (error) throw error;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, fullName: string, phone: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Solo datos descriptivos: el rol lo asigna la base de datos (siempre 'cliente').
      data: { full_name: fullName, phone: phone || null },
      emailRedirectTo: `${publicEnv?.siteUrl ?? window.location.origin}/ingresar`,
    },
  });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${publicEnv?.siteUrl ?? window.location.origin}/restablecer-contrasena`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
