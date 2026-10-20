// Recetas (lista de materiales + etapas) y tareas de producción.
import { supabase } from '../lib/supabase';
import type {
  MyTask, ProductionStage, ProductionTask, Recipe, RecipeMaterial, RecipeStage, TaskLogEntry, TaskStatus,
} from '../types/db';

export async function listStages(): Promise<ProductionStage[]> {
  const { data, error } = await supabase.from('production_stages').select('*').order('sort_order');
  if (error) throw error;
  return data as ProductionStage[];
}

export interface RecipeWithLines extends Recipe {
  recipe_materials: RecipeMaterial[];
  recipe_stages: RecipeStage[];
}

export async function listRecipes(productId: string): Promise<RecipeWithLines[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*, recipe_materials(*), recipe_stages(*)')
    .eq('product_id', productId)
    .order('version', { ascending: false });
  if (error) throw error;
  return data as RecipeWithLines[];
}

/** Crea una nueva versión (inactiva) copiando opcionalmente la versión indicada. */
export async function createRecipeVersion(productId: string, copyFrom?: RecipeWithLines): Promise<string> {
  const { data: last } = await supabase
    .from('recipes').select('version').eq('product_id', productId).order('version', { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const { data, error } = await supabase
    .from('recipes')
    .insert({ product_id: productId, version, yield_qty: copyFrom?.yield_qty ?? 1, is_active: false, notes: copyFrom?.notes ?? '' })
    .select('id')
    .single();
  if (error) throw error;
  const id = data.id as string;
  if (copyFrom) {
    if (copyFrom.recipe_materials.length) {
      const { error: e1 } = await supabase.from('recipe_materials').insert(
        copyFrom.recipe_materials.map((m) => ({ recipe_id: id, stock_item_id: m.stock_item_id, quantity: m.quantity })));
      if (e1) throw e1;
    }
    if (copyFrom.recipe_stages.length) {
      const { error: e2 } = await supabase.from('recipe_stages').insert(
        copyFrom.recipe_stages.map((s) => ({ recipe_id: id, stage_id: s.stage_id, minutes_per_unit: s.minutes_per_unit })));
      if (e2) throw e2;
    }
  }
  return id;
}

export async function updateRecipe(id: string, patch: Partial<Pick<Recipe, 'yield_qty' | 'notes'>>): Promise<void> {
  const { error } = await supabase.from('recipes').update(patch).eq('id', id);
  if (error) throw error;
}

/** Activa una versión y desactiva las demás del mismo producto. */
export async function activateRecipe(productId: string, recipeId: string): Promise<void> {
  const { error: e1 } = await supabase.from('recipes').update({ is_active: false }).eq('product_id', productId).eq('is_active', true);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('recipes').update({ is_active: true }).eq('id', recipeId);
  if (e2) throw e2;
}

export async function upsertRecipeMaterial(recipeId: string, stockItemId: string, quantity: number): Promise<void> {
  const { error } = await supabase.from('recipe_materials')
    .upsert({ recipe_id: recipeId, stock_item_id: stockItemId, quantity }, { onConflict: 'recipe_id,stock_item_id' });
  if (error) throw error;
}

export async function removeRecipeMaterial(recipeId: string, stockItemId: string): Promise<void> {
  const { error } = await supabase.from('recipe_materials').delete().eq('recipe_id', recipeId).eq('stock_item_id', stockItemId);
  if (error) throw error;
}

export async function upsertRecipeStage(recipeId: string, stageId: string, minutes: number): Promise<void> {
  const { error } = await supabase.from('recipe_stages')
    .upsert({ recipe_id: recipeId, stage_id: stageId, minutes_per_unit: minutes }, { onConflict: 'recipe_id,stage_id' });
  if (error) throw error;
}

export async function removeRecipeStage(recipeId: string, stageId: string): Promise<void> {
  const { error } = await supabase.from('recipe_stages').delete().eq('recipe_id', recipeId).eq('stage_id', stageId);
  if (error) throw error;
}

// --- Tareas -----------------------------------------------------------------
export interface AdminTask extends ProductionTask {
  orders: { code: string; status: string; promised_date: string | null } | null;
  production_stages: { name: string } | null;
  profiles: { full_name: string; email: string } | null;
}

export async function listOpenTasks(includeCompleted = false): Promise<AdminTask[]> {
  let q = supabase
    .from('production_tasks')
    .select('*, orders(code, status, promised_date), production_stages(name), profiles:assigned_to(full_name, email)')
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .order('created_at');
  if (!includeCompleted) q = q.neq('status', 'completada');
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as AdminTask[];
}

export async function listTasksForOrder(orderId: string): Promise<AdminTask[]> {
  const { data, error } = await supabase
    .from('production_tasks')
    .select('*, orders(code, status, promised_date), production_stages(name), profiles:assigned_to(full_name, email)')
    .eq('order_id', orderId)
    .order('sort_order');
  if (error) throw error;
  return data as unknown as AdminTask[];
}

export async function assignTask(taskId: string, employeeId: string | null, scheduledDate: string | null): Promise<void> {
  const { error } = await supabase.rpc('admin_assign_task', {
    p_task: taskId, p_employee: employeeId, p_scheduled_date: scheduledDate,
  });
  if (error) throw error;
}

export async function listMyTasks(): Promise<MyTask[]> {
  const { data, error } = await supabase.rpc('my_tasks');
  if (error) throw error;
  return (data ?? []) as MyTask[];
}

export async function updateMyTask(taskId: string, status: TaskStatus, minutes: number, note: string): Promise<void> {
  const { error } = await supabase.rpc('employee_update_task', {
    p_task: taskId, p_status: status, p_minutes: minutes, p_note: note,
  });
  if (error) throw error;
}

export async function taskHistory(taskId: string): Promise<TaskLogEntry[]> {
  const { data, error } = await supabase.rpc('task_history', { p_task: taskId });
  if (error) throw error;
  return (data ?? []) as TaskLogEntry[];
}
