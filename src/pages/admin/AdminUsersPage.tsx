// Gestión de roles: promover clientes registrados a empleados, desactivar cuentas.
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge, ErrorState, Notice, PageHeader, Spinner } from '../../components/ui/Feedback';
import { InputField } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/Modal';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { listProfiles, setUserRole } from '../../services/admin';
import { errorMessage } from '../../lib/errors';
import { formatDate } from '../../lib/format';
import type { AppRole, Profile } from '../../types/db';

const ROLE_LABEL: Record<AppRole, string> = { admin: 'Administrador', empleado: 'Empleado', cliente: 'Cliente' };

export function AdminUsersPage() {
  const { profile: me } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const users = useAsync(() => listProfiles(term), [term]);
  const [pending, setPending] = useState<{ user: Profile; role: AppRole; active: boolean } | null>(null);

  const apply = async () => {
    if (!pending) return;
    try {
      await setUserRole(pending.user.id, pending.role, pending.active);
      toast.success('Permisos actualizados.');
      setPending(null);
      await users.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader title="Usuarios y roles" />
      <div className="mb-4"><Notice tone="info">
        Para incorporar un empleado: pídale que se registre en la tienda con su correo; luego búsquelo aquí y asígnele el rol <strong>Empleado</strong>.
        Nadie puede elegir un rol al registrarse. Para retirar el acceso, cambie el rol a Cliente o desactive la cuenta.
      </Notice></div>
      <form className="mb-4 flex max-w-md items-end gap-2" onSubmit={(e) => { e.preventDefault(); setTerm(search); }}>
        <InputField label="Buscar por correo o nombre" wrapperClassName="flex-1" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" variant="secondary">Buscar</Button>
      </form>
      {users.loading && !users.data && <Spinner />}
      {users.error && <ErrorState message={users.error} onRetry={users.reload} />}
      {users.data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr></thead>
            <tbody>
              {users.data.map((u) => {
                const self = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td><p className="font-bold">{u.full_name || '—'}</p><p className="text-xs text-ink-500">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p></td>
                    <td><Badge tone={u.role === 'admin' ? 'pink' : u.role === 'empleado' ? 'purple' : 'gray'}>{ROLE_LABEL[u.role]}</Badge></td>
                    <td>{u.is_active ? <Badge tone="green">Activo</Badge> : <Badge tone="red">Desactivado</Badge>}</td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>
                      {self ? <span className="text-xs text-ink-500">Su cuenta</span> : (
                        <div className="flex flex-wrap gap-1">
                          {(['cliente', 'empleado', 'admin'] as AppRole[]).filter((r) => r !== u.role).map((r) => (
                            <Button key={r} size="sm" variant="secondary" onClick={() => setPending({ user: u, role: r, active: u.is_active })}>Hacer {ROLE_LABEL[r].toLowerCase()}</Button>
                          ))}
                          <Button size="sm" variant="ghost" className={u.is_active ? 'text-rose-700' : ''} onClick={() => setPending({ user: u, role: u.role, active: !u.is_active })}>
                            {u.is_active ? 'Desactivar' : 'Reactivar'}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog open={!!pending} title="Confirmar cambio de permisos" danger={pending?.role === 'admin' || pending?.active === false}
        message={pending ? <>¿Asignar a <strong>{pending.user.email}</strong> el rol <strong>{ROLE_LABEL[pending.role]}</strong> y dejar la cuenta <strong>{pending.active ? 'activa' : 'desactivada'}</strong>?
          {pending.role === 'admin' && ' Un administrador tiene acceso total al negocio.'}</> : ''}
        onConfirm={apply} onClose={() => setPending(null)} />
    </div>
  );
}
