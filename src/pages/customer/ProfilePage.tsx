// Perfil del usuario (nombre y teléfono) y direcciones de entrega guardadas.
import { lazy, Suspense, useEffect, useState } from 'react';
import { MapPin, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge, ErrorState, Notice, PageHeader, Spinner } from '../../components/ui/Feedback';
import { InputField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { deleteAddress, listAddresses, saveAddress, updateMyProfile } from '../../services/account';
import { errorMessage } from '../../lib/errors';
import { fieldErrors, profileSchema } from '../../lib/validation';

const DeliveryMap = lazy(() => import('../../components/map/DeliveryMap').then((m) => ({ default: m.DeliveryMap })));

const ROLE_LABEL = { admin: 'Administrador', empleado: 'Empleado', cliente: 'Cliente' } as const;

export function ProfilePage() {
  const { session, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const addresses = useAsync(listAddresses, []);
  const [addrOpen, setAddrOpen] = useState(false);
  const [addr, setAddr] = useState({ label: 'Casa', address_text: '', reference: '', lat: null as number | null, lng: null as number | null });

  useEffect(() => {
    if (profile) setForm({ fullName: profile.full_name, phone: profile.phone ?? '' });
  }, [profile]);

  if (!profile || !session) return <Spinner />;

  const save = async () => {
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setErrors({});
    setSaving(true);
    try {
      await updateMyProfile(session.user.id, parsed.data.fullName, parsed.data.phone);
      await refreshProfile();
      toast.success('Datos actualizados.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const saveAddr = async () => {
    if (addr.address_text.trim().length < 3 || addr.lat === null || addr.lng === null) {
      toast.warning('Indique la dirección y marque el punto en el mapa.');
      return;
    }
    try {
      await saveAddress(session.user.id, { label: addr.label.trim() || 'Mi dirección', address_text: addr.address_text.trim(), reference: addr.reference.trim(), lat: addr.lat, lng: addr.lng });
      setAddrOpen(false);
      setAddr({ label: 'Casa', address_text: '', reference: '', lat: null, lng: null });
      await addresses.reload();
      toast.success('Dirección guardada.');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <PageHeader title="Mi perfil" subtitle={profile.email} actions={<Badge tone="pink">{ROLE_LABEL[profile.role]}</Badge>} />
      <section className="card space-y-4 p-5">
        <h2 className="text-xl">Datos personales</h2>
        <InputField label="Nombre completo" value={form.fullName} error={errors.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <InputField label="Teléfono / WhatsApp" type="tel" value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Button loading={saving} onClick={save}>Guardar cambios</Button>
      </section>

      <section className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Direcciones de entrega</h2>
          <Button size="sm" variant="secondary" icon={<MapPin className="h-4 w-4" />} onClick={() => setAddrOpen(true)}>Agregar</Button>
        </div>
        {addresses.loading && !addresses.data && <Spinner />}
        {addresses.error && <ErrorState message={addresses.error} onRetry={addresses.reload} />}
        {addresses.data?.length === 0 && <p className="text-sm text-ink-500">No tiene direcciones guardadas.</p>}
        <ul className="divide-y divide-ink-100">
          {addresses.data?.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-2">
              <div><p className="font-bold">{a.label}</p><p className="text-sm text-ink-500">{a.address_text}{a.reference ? ` · ${a.reference}` : ''}</p></div>
              <button type="button" className="rounded-xl p-2 text-rose-700 hover:bg-rose-50" aria-label={`Eliminar ${a.label}`}
                onClick={async () => { try { await deleteAddress(a.id); await addresses.reload(); } catch (e) { toast.error(errorMessage(e)); } }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Notice tone="info">Para cambiar su correo o su contraseña use “¿Olvidó su contraseña?” en la pantalla de ingreso. Su rol solo puede modificarlo el administrador.</Notice>

      <Modal open={addrOpen} title="Nueva dirección" size="lg" onClose={() => setAddrOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setAddrOpen(false)}>Cancelar</Button><Button onClick={saveAddr}>Guardar</Button></>}>
        <div className="space-y-3">
          <InputField label="Nombre (Casa, Trabajo…)" value={addr.label} maxLength={40} onChange={(e) => setAddr({ ...addr, label: e.target.value })} />
          <Suspense fallback={<Spinner label="Cargando mapa…" />}>
            <DeliveryMap value={addr.lat !== null && addr.lng !== null ? { lat: addr.lat, lng: addr.lng } : null}
              onChange={(pos, label) => setAddr((x) => ({ ...x, lat: pos.lat, lng: pos.lng, address_text: label ? label.split(',').slice(0, 3).join(',') : x.address_text }))} />
          </Suspense>
          <InputField label="Dirección" value={addr.address_text} maxLength={300} onChange={(e) => setAddr({ ...addr, address_text: e.target.value })} />
          <InputField label="Referencia" value={addr.reference} maxLength={300} onChange={(e) => setAddr({ ...addr, reference: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
