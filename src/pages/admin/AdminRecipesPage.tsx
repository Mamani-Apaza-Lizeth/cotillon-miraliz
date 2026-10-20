// Recetas versionadas: materiales por unidad producida, etapas y tiempos, costo estimado.
import { useMemo, useState } from 'react';
import { CheckCircle2, CopyPlus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge, EmptyState, ErrorState, Notice, PageHeader, Spinner } from '../../components/ui/Feedback';
import { InputField, SelectField } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { listAllProducts } from '../../services/catalogAdmin';
import { listStockItems, materialCheck } from '../../services/inventory';
import {
  activateRecipe, createRecipeVersion, listRecipes, listStages, removeRecipeMaterial, removeRecipeStage, updateRecipe,
  upsertRecipeMaterial, upsertRecipeStage, type RecipeWithLines,
} from '../../services/production';
import { errorMessage } from '../../lib/errors';
import { formatMinutes, formatMoney, formatQty, MEASURE_UNIT_LABEL } from '../../lib/format';
import { recipeEstimatedCost } from '../../lib/rules';
import type { MaterialCheckRow } from '../../types/db';

export function AdminRecipesPage() {
  const toast = useToast();
  const base = useAsync(async () => {
    const [products, stock, stages] = await Promise.all([listAllProducts(), listStockItems(), listStages()]);
    return { products: products.filter((p) => p.product_type === 'personalizado'), materials: stock.filter((s) => s.kind === 'material'), stages };
  }, []);
  const [productId, setProductId] = useState('');
  const recipes = useAsync(() => (productId ? listRecipes(productId) : Promise.resolve([] as RecipeWithLines[])), [productId]);
  const [selectedId, setSelectedId] = useState('');
  const [newMat, setNewMat] = useState({ id: '', qty: '' });
  const [newStage, setNewStage] = useState({ id: '', minutes: '' });
  const [checkQty, setCheckQty] = useState('1');
  const [check, setCheck] = useState<MaterialCheckRow[] | null>(null);

  const costs = useMemo(() => new Map((base.data?.materials ?? []).map((m) => [m.id, m.ref_cost === null ? null : Number(m.ref_cost)])), [base.data]);
  const recipe = recipes.data?.find((r) => r.id === selectedId) ?? recipes.data?.find((r) => r.is_active) ?? recipes.data?.[0];

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); if (ok) toast.success(ok); await recipes.reload(); } catch (e) { toast.error(errorMessage(e)); }
  };

  if (base.loading && !base.data) return <Spinner />;
  if (base.error) return <ErrorState message={base.error} onRetry={base.reload} />;
  const materialName = (id: string) => base.data?.materials.find((m) => m.id === id);
  const stageName = (id: string) => base.data?.stages.find((s) => s.id === id)?.name ?? '—';

  return (
    <div className="space-y-6">
      <PageHeader title="Recetas de producción" subtitle="Materiales y tiempos por producto personalizado. Se usan para reservar materiales, crear tareas y calcular fechas." />
      <div className="card grid gap-3 p-4 md:grid-cols-2">
        <SelectField label="Producto personalizado" value={productId} onChange={(e) => { setProductId(e.target.value); setSelectedId(''); setCheck(null); }}>
          <option value="">— Seleccione —</option>
          {base.data?.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </SelectField>
        {recipes.data && recipes.data.length > 0 && (
          <SelectField label="Versión" value={recipe?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
            {recipes.data.map((r) => <option key={r.id} value={r.id}>v{r.version}{r.is_active ? ' (activa)' : ''}</option>)}
          </SelectField>
        )}
      </div>

      {productId && recipes.loading && !recipes.data && <Spinner />}
      {productId && recipes.data?.length === 0 && (
        <EmptyState title="Este producto no tiene receta" description="Cree la primera versión y luego actívela."
          action={<Button onClick={() => run(() => createRecipeVersion(productId), 'Receta creada.')}>Crear receta</Button>} />
      )}

      {recipe && (
        <section className="card space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl">Versión {recipe.version} {recipe.is_active ? <Badge tone="green">Activa</Badge> : <Badge>Borrador</Badge>}</h2>
            <div className="flex gap-2">
              {!recipe.is_active && <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => run(() => activateRecipe(productId, recipe.id), 'Versión activada.')}>Activar</Button>}
              <Button variant="secondary" icon={<CopyPlus className="h-4 w-4" />} onClick={() => run(async () => { const id = await createRecipeVersion(productId, recipe); setSelectedId(id); }, 'Nueva versión creada (borrador).')}>Nueva versión</Button>
            </div>
          </div>
          {recipe.is_active && <Notice tone="info">Los cambios en la versión activa afectan a los pedidos nuevos. Para cambios grandes cree una nueva versión y actívela cuando esté lista.</Notice>}
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField label="Unidades que produce la receta" type="number" min={1} defaultValue={recipe.yield_qty} key={`y-${recipe.id}`}
              onBlur={(e) => { const v = Number(e.target.value); if (v >= 1 && v !== recipe.yield_qty) void run(() => updateRecipe(recipe.id, { yield_qty: v })); }} />
            <div className="card p-3"><p className="text-xs font-bold text-ink-500">Tiempo por unidad</p><p className="font-display text-xl">{formatMinutes(recipe.recipe_stages.reduce((s, x) => s + x.minutes_per_unit, 0))}</p></div>
            <div className="card p-3"><p className="text-xs font-bold text-ink-500">Costo estimado de materiales por unidad</p>
              <p className="font-display text-xl">{(() => { const c = recipeEstimatedCost(recipe, costs); return c === null ? 'Falta costo de referencia' : formatMoney(c); })()}</p>
              <p className="text-xs text-ink-500">Estimación con costos de referencia; no es costo real.</p></div>
          </div>

          <div>
            <h3 className="mb-2 text-lg">Materiales (para {recipe.yield_qty} unidad/es)</h3>
            <ul className="divide-y divide-ink-100">
              {recipe.recipe_materials.map((m) => {
                const mat = materialName(m.stock_item_id);
                return (
                  <li key={m.stock_item_id} className="flex items-center justify-between gap-2 py-2">
                    <span>{mat?.name ?? '—'}</span>
                    <span className="flex items-center gap-2">
                      <input type="number" min={0.001} step="0.001" className="input w-28 py-1" defaultValue={m.quantity} aria-label={`Cantidad de ${mat?.name}`}
                        onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== Number(m.quantity)) void run(() => upsertRecipeMaterial(recipe.id, m.stock_item_id, v)); }} />
                      <span className="w-16 text-sm text-ink-500">{mat ? MEASURE_UNIT_LABEL[mat.unit] : ''}</span>
                      <button type="button" className="rounded-xl p-2 text-rose-700 hover:bg-rose-50" aria-label="Quitar material"
                        onClick={() => run(() => removeRecipeMaterial(recipe.id, m.stock_item_id))}><Trash2 className="h-4 w-4" /></button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <SelectField label="Agregar material" value={newMat.id} onChange={(e) => setNewMat({ ...newMat, id: e.target.value })}>
                <option value="">—</option>
                {base.data?.materials.filter((m) => m.is_active).map((m) => <option key={m.id} value={m.id}>{m.name} ({MEASURE_UNIT_LABEL[m.unit]})</option>)}
              </SelectField>
              <InputField label="Cantidad" type="number" min={0.001} step="0.001" value={newMat.qty} onChange={(e) => setNewMat({ ...newMat, qty: e.target.value })} />
              <Button variant="secondary" disabled={!newMat.id || !(Number(newMat.qty) > 0)}
                onClick={() => run(async () => { await upsertRecipeMaterial(recipe.id, newMat.id, Number(newMat.qty)); setNewMat({ id: '', qty: '' }); })}>Agregar</Button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg">Etapas y minutos por unidad</h3>
            <ul className="divide-y divide-ink-100">
              {recipe.recipe_stages.map((s) => (
                <li key={s.stage_id} className="flex items-center justify-between gap-2 py-2">
                  <span>{stageName(s.stage_id)}</span>
                  <span className="flex items-center gap-2">
                    <input type="number" min={1} className="input w-24 py-1" defaultValue={s.minutes_per_unit} aria-label={`Minutos de ${stageName(s.stage_id)}`}
                      onBlur={(e) => { const v = Math.round(Number(e.target.value)); if (v > 0 && v !== s.minutes_per_unit) void run(() => upsertRecipeStage(recipe.id, s.stage_id, v)); }} />
                    <span className="text-sm text-ink-500">min</span>
                    <button type="button" className="rounded-xl p-2 text-rose-700 hover:bg-rose-50" aria-label="Quitar etapa"
                      onClick={() => run(() => removeRecipeStage(recipe.id, s.stage_id))}><Trash2 className="h-4 w-4" /></button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <SelectField label="Agregar etapa" value={newStage.id} onChange={(e) => setNewStage({ ...newStage, id: e.target.value })}>
                <option value="">—</option>
                {base.data?.stages.filter((s) => !recipe.recipe_stages.some((r) => r.stage_id === s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectField>
              <InputField label="Minutos por unidad" type="number" min={1} value={newStage.minutes} onChange={(e) => setNewStage({ ...newStage, minutes: e.target.value })} />
              <Button variant="secondary" disabled={!newStage.id || !(Number(newStage.minutes) > 0)}
                onClick={() => run(async () => { await upsertRecipeStage(recipe.id, newStage.id, Math.round(Number(newStage.minutes))); setNewStage({ id: '', minutes: '' }); })}>Agregar</Button>
            </div>
          </div>

          {recipe.is_active && (
            <div className="rounded-2xl bg-ink-50 p-4">
              <h3 className="text-lg">Verificar materiales para una cantidad</h3>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <InputField label="Unidades" type="number" min={1} value={checkQty} onChange={(e) => setCheckQty(e.target.value)} />
                <Button variant="secondary" onClick={async () => { try { setCheck(await materialCheck(productId, Math.max(1, Number(checkQty) || 1))); } catch (e) { toast.error(errorMessage(e)); } }}>Verificar</Button>
              </div>
              {check && (
                <ul className="mt-3 space-y-1 text-sm">
                  {check.map((r) => (
                    <li key={r.stock_item_id}>{r.name}: necesita {formatQty(r.needed)} {MEASURE_UNIT_LABEL[r.unit]}, disponible {formatQty(r.available)} {r.sufficient ? <Badge tone="green">OK</Badge> : <Badge tone="red">Falta</Badge>}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
