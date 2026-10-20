import { useState } from 'react';
import { ErrorState, PageHeader, Spinner } from '../../components/ui/Feedback';
import { SelectField } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { listAudit, profileNames } from '../../services/admin';
import { formatDateTime } from '../../lib/format';

const ENTITIES = ['', 'orders', 'payments', 'quotes', 'products', 'stock_items', 'recipes', 'production_tasks', 'profiles', 'app_settings', 'categories', 'suppliers'];

export function AdminAuditPage() {
  const [entity, setEntity] = useState('');
  const data = useAsync(async () => {
    const rows = await listAudit(entity);
    const names = await profileNames(rows.map((r) => r.actor_id ?? ''));
    return { rows, names };
  }, [entity]);

  return (
    <div>
      <PageHeader title="Auditoría" subtitle="Registro de operaciones importantes. Es de solo lectura." />
      <div className="mb-4 max-w-xs">
        <SelectField label="Entidad" value={entity} onChange={(e) => setEntity(e.target.value)}>
          {ENTITIES.map((e) => <option key={e} value={e}>{e || 'Todas'}</option>)}
        </SelectField>
      </div>
      {data.loading && !data.data && <Spinner />}
      {data.error && <ErrorState message={data.error} onRetry={data.reload} />}
      {data.data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
            <tbody>
              {data.data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                  <td>{r.actor_id ? data.data?.names.get(r.actor_id) ?? r.actor_id.slice(0, 8) : 'Sistema'}<span className="block text-xs text-ink-500">{r.actor_role}</span></td>
                  <td className="font-bold">{r.action}</td>
                  <td>{r.entity}<span className="block font-mono text-[11px] text-ink-400">{r.entity_id?.slice(0, 13)}</span></td>
                  <td><pre className="max-h-32 max-w-md overflow-auto whitespace-pre-wrap break-all text-[11px] text-ink-700">{JSON.stringify(r.details, null, 1)}</pre></td>
                </tr>
              ))}
              {data.data.rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-ink-500">Sin registros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
