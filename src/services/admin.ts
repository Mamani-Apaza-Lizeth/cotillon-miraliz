// Usuarios y roles, configuración, panel de indicadores y auditoría (administrador).
import { supabase } from '../lib/supabase';
import type { AppRole, AppSettingRow, AuditEntry, DashboardData, Profile, PublicSettings } from '../types/db';

export async function listProfiles(search = ''): Promise<Profile[]> {
  let q = supabase.from('profiles').select('*').order('role').order('full_name').limit(200);
  const term = search.replace(/[%,()*\\:"']/g, ' ').trim();
  if (term) q = q.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data as Profile[];
}

export async function listEmployees(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').in('role', ['empleado', 'admin']).eq('is_active', true).order('full_name');
  if (error) throw error;
  return data as Profile[];
}

export async function setUserRole(userId: string, role: AppRole, active: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_role', { p_user: userId, p_role: role, p_active: active });
  if (error) throw error;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const { data, error } = await supabase.from('app_settings').select('key, value').eq('is_public', true);
  if (error) throw error;
  const map = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  return map as unknown as PublicSettings;
}

export async function listAllSettings(): Promise<AppSettingRow[]> {
  const { data, error } = await supabase.from('app_settings').select('*').order('key');
  if (error) throw error;
  return data as AppSettingRow[];
}

export async function updateSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase.from('app_settings').update({ value }).eq('key', key);
  if (error) throw error;
}

export async function getDashboard(from: string, to: string): Promise<DashboardData> {
  const { data, error } = await supabase.rpc('admin_dashboard', { p_from: from, p_to: to });
  if (error) throw error;
  return data as DashboardData;
}

export async function listAudit(entity = '', limit = 200): Promise<AuditEntry[]> {
  let q = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
  if (entity) q = q.eq('entity', entity);
  const { data, error } = await q;
  if (error) throw error;
  return data as AuditEntry[];
}

export async function profileNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('id, full_name, email').in('id', unique);
  if (error) throw error;
  return new Map((data ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, p.full_name || p.email]));
}
