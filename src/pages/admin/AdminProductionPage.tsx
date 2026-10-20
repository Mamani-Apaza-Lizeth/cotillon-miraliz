// Planificación de producción: tareas abiertas, asignación, fechas y atrasos.
import { useState } from 'react';
import { Link } from 'react-router';
import { Badge, EmptyState, ErrorState, Notice, PageHeader, Spinner } from '../../components/ui/Feedback';
import { Checkbox } from '../../components/ui/Field';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { listEmployees } from '../../services/admin';
import { assignTask, listOpenTasks } from '../../services/production';
import { errorMessage } from '../../lib/errors';
import { formatDate, formatMinutes, TASK_STATUS_LABEL, todayInLaPaz } from '../../lib/format';

export function AdminProductionPage() {
  const toast = useToast();
  const [showDone, setShowDone] = useState(false);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const tasks = useAsync(() => listOpenTasks(showDone), [showDone]);
  const employees = useAsync(listEmployees, []);
  const today = todayInLaPaz();

  const assign = async (taskId: string, employee: string, date: string) => {
    try {
      await assignTask(taskId, employee || null, date || null);
      await tasks.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const list = (tasks.data ?? []).filter((t) => !onlyUnassigned || !t.assigned_to);
  const pendingMinutes = list.filter((t) => t.status !== 'completada').reduce((s, t) => s + Math.max(0, t.est_minutes - t.spent_minutes), 0);

  return (
    <div>
      <PageHeader title="Producción" subtitle={`Carga pendiente en esta vista: ${formatMinutes(pendingMinutes)}`} />
      <div className="mb-4 flex flex-wrap gap-4">
        <Checkbox label="Solo sin asignar" checked={onlyUnassigned} onChange={(e) => setOnlyUnassigned(e.target.checked)} />
        <Checkbox label="Incluir completadas" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
      </div>
      {employees.data?.filter((e) => e.role === 'empleado').length === 0 && (
        <div className="mb-4"><Notice tone="warning">No hay empleados habilitados. Asigne el rol “empleado” desde Usuarios y roles.</Notice></div>
      )}
      {tasks.loading && !tasks.data && <Spinner />}
      {tasks.error && <ErrorState message={tasks.error} onRetry={tasks.reload} />}
      {tasks.data && list.length === 0 && <EmptyState title="No hay tareas" description="Las tareas se crean automáticamente al confirmarse un pedido con productos personalizados." />}
      {list.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Pedido</th><th>Tarea</th><th>Estado</th><th>Tiempo</th><th>Responsable</th><th>Programada</th><th>Entrega</th></tr></thead>
            <tbody>
              {list.map((t) => {
                const late = t.status !== 'completada' && ((t.scheduled_date && t.scheduled_date < today) || (t.orders?.promised_date && t.orders.promised_date < today));
                return (
                  <tr key={t.id}>
                    <td><Link to={`/admin/pedidos/${t.order_id}`} className="font-bold text-brand-700 hover:underline">{t.orders?.code}</Link></td>
                    <td>{t.title}</td>
                    <td><Badge tone={t.status === 'completada' ? 'green' : t.status === 'bloqueada' ? 'red' : t.status === 'en_progreso' ? 'purple' : 'yellow'}>{TASK_STATUS_LABEL[t.status]}</Badge>{late && <span className="ml-1"><Badge tone="red">Atrasada</Badge></span>}</td>
                    <td>{formatMinutes(t.spent_minutes)} / {formatMinutes(t.est_minutes)}</td>
                    <td>
                      <select className="input py-1" aria-label={`Responsable de ${t.title}`} value={t.assigned_to ?? ''} disabled={t.status === 'completada'}
                        onChange={(e) => assign(t.id, e.target.value, t.scheduled_date ?? '')}>
                        <option value="">Sin asignar</option>
                        {employees.data?.map((e) => <option key={e.id} value={e.id}>{e.full_name || e.email}</option>)}
                      </select>
                    </td>
                    <td><input type="date" className="input py-1" aria-label={`Fecha de ${t.title}`} value={t.scheduled_date ?? ''} disabled={t.status === 'completada'}
                      onChange={(e) => assign(t.id, t.assigned_to ?? '', e.target.value)} /></td>
                    <td>{formatDate(t.orders?.promised_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
