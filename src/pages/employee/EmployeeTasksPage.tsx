// Tareas asignadas al empleado: lista, calendario semanal, avance y bitácora.
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, History, ListTodo, PauseCircle, PlayCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Feedback';
import { InputField, TextAreaField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { listMyTasks, taskHistory, updateMyTask } from '../../services/production';
import { customizationSignedUrl } from '../../lib/storage';
import { errorMessage } from '../../lib/errors';
import { addDays, formatDate, formatDateTime, formatMinutes, TASK_STATUS_LABEL, todayInLaPaz } from '../../lib/format';
import type { MyTask, TaskLogEntry, TaskStatus } from '../../types/db';

const TONE: Record<TaskStatus, 'yellow' | 'purple' | 'green' | 'red'> = { pendiente: 'yellow', en_progreso: 'purple', completada: 'green', bloqueada: 'red' };

function Design({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { customizationSignedUrl(path).then(setUrl); }, [path]);
  return url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Diseño de referencia" className="h-24 w-24 rounded-xl object-cover" /></a> : null;
}

export function EmployeeTasksPage() {
  const toast = useToast();
  const tasks = useAsync(listMyTasks, []);
  const [view, setView] = useState<'lista' | 'semana'>('lista');
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<{ task: MyTask; status: TaskStatus } | null>(null);
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ task: MyTask; rows: TaskLogEntry[] } | null>(null);

  const visible = useMemo(() => (tasks.data ?? []).filter((t) => showDone || t.status !== 'completada'), [tasks.data, showDone]);
  const today = todayInLaPaz();
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const openUpdate = (task: MyTask, status: TaskStatus) => { setEditing({ task, status }); setMinutes(''); setNote(''); };

  const save = async () => {
    if (!editing) return;
    const m = Number(minutes || 0);
    if (!Number.isInteger(m) || m < 0 || m > 960) { toast.warning('Los minutos deben ser un número entre 0 y 960.'); return; }
    setBusy(true);
    try {
      await updateMyTask(editing.task.id, editing.status, m, note.trim());
      toast.success('Avance registrado.');
      setEditing(null);
      await tasks.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async (task: MyTask) => {
    try { setHistory({ task, rows: await taskHistory(task.id) }); } catch (e) { toast.error(errorMessage(e)); }
  };

  const card = (t: MyTask) => {
    const late = t.status !== 'completada' && ((t.scheduled_date && t.scheduled_date < today) || (t.promised_date && t.promised_date < today));
    return (
      <article key={t.id} className="card space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-lg">{t.stage_name ?? 'Elaboración'} · {t.product_name} ×{t.quantity}</p>
          <div className="flex gap-1">{late && <Badge tone="red">Atrasada</Badge>}<Badge tone={TONE[t.status]}>{TASK_STATUS_LABEL[t.status]}</Badge></div>
        </div>
        <p className="text-sm text-ink-500">Pedido {t.order_code} · Programada: {formatDate(t.scheduled_date)} · Entrega comprometida: {formatDate(t.promised_date)}</p>
        {t.template_name && <p className="text-sm">Plantilla: <strong>{t.template_name}</strong></p>}
        {t.custom_description && <p className="rounded-xl bg-ink-50 p-2 text-sm">{t.custom_description}</p>}
        {(t.custom_theme || t.custom_colors) && <p className="text-sm text-ink-500">{[t.custom_theme, t.custom_colors].filter(Boolean).join(' · ')}</p>}
        {t.reference_image_path && <Design path={t.reference_image_path} />}
        <p className="text-sm">Tiempo: <strong>{formatMinutes(t.spent_minutes)}</strong> registrados de {formatMinutes(t.est_minutes)} estimados</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {(t.status === 'pendiente' || t.status === 'bloqueada') && <Button size="sm" icon={<PlayCircle className="h-4 w-4" />} onClick={() => openUpdate(t, 'en_progreso')}>Iniciar / reanudar</Button>}
          {t.status === 'en_progreso' && <Button size="sm" variant="secondary" onClick={() => openUpdate(t, 'en_progreso')}>Registrar avance</Button>}
          {t.status === 'en_progreso' && <Button size="sm" variant="sun" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => openUpdate(t, 'completada')}>Completar</Button>}
          {(t.status === 'pendiente' || t.status === 'en_progreso') && <Button size="sm" variant="ghost" icon={<PauseCircle className="h-4 w-4" />} onClick={() => openUpdate(t, 'bloqueada')}>Bloquear</Button>}
          <Button size="sm" variant="ghost" icon={<History className="h-4 w-4" />} onClick={() => openHistory(t)}>Historial</Button>
        </div>
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Mis tareas" subtitle="Trabajos de producción asignados a usted."
        actions={
          <div className="flex gap-1 rounded-2xl bg-ink-100 p-1">
            <Button size="sm" variant={view === 'lista' ? 'primary' : 'ghost'} icon={<ListTodo className="h-4 w-4" />} onClick={() => setView('lista')}>Lista</Button>
            <Button size="sm" variant={view === 'semana' ? 'primary' : 'ghost'} icon={<CalendarDays className="h-4 w-4" />} onClick={() => setView('semana')}>Semana</Button>
          </div>
        } />
      <label className="mb-4 inline-flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="accent-brand-600" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Mostrar completadas
      </label>
      {tasks.loading && !tasks.data && <Spinner />}
      {tasks.error && <ErrorState message={tasks.error} onRetry={tasks.reload} />}
      {tasks.data && visible.length === 0 && <EmptyState title="No tiene tareas pendientes" description="Cuando el administrador le asigne trabajos aparecerán aquí." />}

      {view === 'lista' && <div className="space-y-3">{visible.map(card)}</div>}

      {view === 'semana' && tasks.data && (
        <div className="grid gap-3 md:grid-cols-7">
          {week.map((d) => {
            const dayTasks = visible.filter((t) => t.scheduled_date === d);
            return (
              <div key={d} className={`rounded-2xl border p-2 ${d === today ? 'border-brand-300 bg-brand-50' : 'border-ink-100 bg-white'}`}>
                <p className="mb-2 text-center text-xs font-extrabold uppercase text-ink-500">
                  {new Date(`${d}T12:00:00`).toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit' })}
                </p>
                <ul className="space-y-1">
                  {dayTasks.map((t) => (
                    <li key={t.id} className="rounded-xl bg-white p-2 text-xs shadow-sm">
                      <p className="font-bold">{t.stage_name ?? 'Elaboración'}</p>
                      <p>{t.product_name} ×{t.quantity}</p>
                      <Badge tone={TONE[t.status]}>{TASK_STATUS_LABEL[t.status]}</Badge>
                    </li>
                  ))}
                  {dayTasks.length === 0 && <li className="text-center text-xs text-ink-400">—</li>}
                </ul>
              </div>
            );
          })}
          <p className="text-xs text-ink-500 md:col-span-7">Las tareas sin fecha programada solo aparecen en la vista de lista.</p>
        </div>
      )}

      <Modal open={!!editing} title={editing ? `${TASK_STATUS_LABEL[editing.status]} · ${editing.task.product_name}` : ''} onClose={() => setEditing(null)}
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Guardar</Button></>}>
        <div className="space-y-3">
          <InputField label="Minutos trabajados en esta sesión" type="number" min={0} max={960} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          <TextAreaField label={editing?.status === 'bloqueada' ? 'Motivo del bloqueo' : 'Observaciones'} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Modal>

      <Modal open={!!history} title="Historial de la tarea" onClose={() => setHistory(null)}>
        {history?.rows.length === 0 && <p className="text-sm text-ink-500">Sin registros todavía.</p>}
        <ul className="space-y-2">
          {history?.rows.map((r, i) => (
            <li key={i} className="rounded-xl bg-ink-50 p-2 text-sm">
              <p className="font-bold">{formatDateTime(r.created_at)} · {r.employee_name ?? '—'}</p>
              <p>{r.new_status ? TASK_STATUS_LABEL[r.new_status] : ''} · {formatMinutes(r.minutes_spent)}</p>
              {r.note && <p className="text-ink-700">{r.note}</p>}
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
