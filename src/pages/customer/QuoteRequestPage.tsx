// Solicitud de cotización con diseño propio (imagen de referencia) o plantilla.
import { useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ImagePlus, X } from 'lucide-react';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, Notice, PageHeader, Spinner } from '../../components/ui/Feedback';
import { InputField, SelectField, TextAreaField } from '../../components/ui/Field';
import { FulfillmentPicker } from '../../components/map/FulfillmentPicker';
import { EMPTY_FULFILLMENT, type FulfillmentValue } from '../../lib/fulfillment';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getProductBySlug } from '../../services/catalog';
import { requestQuote } from '../../services/orders';
import { removeCustomization, uploadCustomization } from '../../lib/storage';
import { errorMessage } from '../../lib/errors';
import { addDays, todayInLaPaz } from '../../lib/format';
import { newIdempotencyKey } from '../../lib/idempotency';
import { fieldErrors, quoteRequestSchema, validateImageFile } from '../../lib/validation';
import type { DeliveryQuote } from '../../types/db';

export function QuoteRequestPage() {
  const { slug = '' } = useParams();
  const { session } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const product = useAsync(() => getProductBySlug(slug), [slug]);
  const [form, setForm] = useState({ quantity: '', description: '', theme: '', colors: '', requestedDate: '', templateId: '', notes: '' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<FulfillmentValue>(EMPTY_FULFILLMENT);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey('quote'));

  if (product.loading) return <Spinner />;
  if (product.error) return <div className="mx-auto max-w-4xl px-4 py-8"><ErrorState message={product.error} onRetry={product.reload} /></div>;
  const p = product.data;
  if (!p || p.product_type !== 'personalizado' || !p.allows_custom_design) {
    return <div className="mx-auto max-w-4xl px-4 py-8"><EmptyState title="Este producto no admite diseños propios" action={<ButtonLink to="/catalogo">Volver al catálogo</ButtonLink>} /></div>;
  }

  const minDate = addDays(todayInLaPaz(), 1);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const problem = validateImageFile(f);
    if (problem) { setErrors((x) => ({ ...x, file: problem })); return; }
    setErrors((x) => { const { file: _omit, ...rest } = x; void _omit; return rest; });
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    const parsed = quoteRequestSchema.safeParse({ ...form, quantity: form.quantity || p.min_order_qty });
    const e: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);
    if (parsed.success && parsed.data.quantity < p.min_order_qty) e.quantity = `La cantidad mínima es ${p.min_order_qty}.`;
    if (parsed.success && parsed.data.requestedDate < minDate) e.requestedDate = 'La fecha debe ser posterior a hoy.';
    if (!file && !form.templateId) e.file = 'Adjunte una imagen de referencia o elija una plantilla base.';
    if (fulfillment.fulfillment === 'entrega') {
      if (fulfillment.lat === null) e.location = 'Marque el punto de entrega en el mapa.';
      else if (deliveryQuote && !deliveryQuote.within_coverage) e.location = 'La ubicación está fuera del área de cobertura.';
      if (fulfillment.addressText.trim().length < 3) e.addressText = 'Ingrese la dirección.';
    }
    setErrors(e);
    if (Object.keys(e).length > 0 || !parsed.success || !session) return;

    setBusy(true);
    setServerError(null);
    let uploaded: string | null = null;
    try {
      if (file) uploaded = await uploadCustomization(session.user.id, file);
      const orderId = await requestQuote({
        productId: p.id,
        quantity: parsed.data.quantity,
        description: parsed.data.description,
        requestedDate: parsed.data.requestedDate,
        fulfillment: fulfillment.fulfillment,
        imagePath: uploaded,
        templateId: form.templateId || null,
        theme: parsed.data.theme,
        colors: parsed.data.colors,
        addressText: fulfillment.addressText.trim(),
        addressReference: fulfillment.reference.trim(),
        lat: fulfillment.lat,
        lng: fulfillment.lng,
        notes: form.notes.trim(),
        idempotencyKey: key.current,
      });
      toast.success('Solicitud enviada. Le avisaremos cuando la cotización esté lista.');
      navigate(`/mis-pedidos/${orderId}`, { replace: true });
    } catch (err) {
      if (uploaded) await removeCustomization(uploaded);
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const templates = p.customization_templates ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={`Cotizar: ${p.name}`} subtitle="Envíenos su idea. Revisaremos el diseño y le responderemos con precio y fecha de entrega antes de cobrar." />
      <div className="space-y-6">
        <section className="card space-y-4 p-5">
          <div>
            <span className="label">Imagen de referencia</span>
            <div className="flex flex-wrap items-center gap-4">
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Vista previa del diseño" className="h-32 w-32 rounded-2xl border border-ink-100 object-cover" />
                  <button type="button" className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow" aria-label="Quitar imagen"
                    onClick={() => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); }}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 px-4 py-3 font-bold text-brand-700 hover:bg-brand-100">
                <ImagePlus className="h-5 w-5" aria-hidden />{file ? 'Cambiar imagen' : 'Subir imagen'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
              </label>
            </div>
            <p className="mt-1 text-xs text-ink-500">JPG, PNG o WEBP de hasta 5 MB. Solo usted y el personal de la tienda podrán verla.</p>
            {errors.file && <p className="mt-1 text-xs font-bold text-rose-600" role="alert">{errors.file}</p>}
          </div>
          {templates.length > 0 && (
            <SelectField label="Plantilla base (opcional)" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
              <option value="">Ninguna</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </SelectField>
          )}
          <TextAreaField label="Describa el trabajo" value={form.description} error={errors.description} maxLength={2000}
            placeholder="Ej.: piñata del número 5 con dinosaurios verdes y el nombre MATEO" onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField label="Temática" value={form.theme} maxLength={120} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
            <InputField label="Colores" value={form.colors} maxLength={120} onChange={(e) => setForm({ ...form, colors: e.target.value })} />
            <InputField label={`Cantidad (mínimo ${p.min_order_qty})`} type="number" min={p.min_order_qty} max={1000} inputMode="numeric"
              value={form.quantity} placeholder={String(p.min_order_qty)} error={errors.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <InputField label="Fecha deseada" type="date" min={minDate} max={addDays(minDate, 365)} value={form.requestedDate}
              error={errors.requestedDate} onChange={(e) => setForm({ ...form, requestedDate: e.target.value })}
              hint="La fecha final se confirma en la cotización." />
          </div>
        </section>

        <section className="card p-5">
          <FulfillmentPicker value={fulfillment} onChange={setFulfillment} onQuote={setDeliveryQuote} errors={errors} />
        </section>

        <section className="card space-y-3 p-5">
          <TextAreaField label="Notas adicionales (opcional)" value={form.notes} maxLength={1000} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Notice tone="info">Mientras la cotización esté pendiente no se realizará ningún cobro.</Notice>
          {serverError && <Notice tone="danger">{serverError}</Notice>}
          <div className="flex flex-wrap gap-2">
            <Button size="lg" loading={busy} onClick={submit}>Enviar solicitud</Button>
            <Link to={`/producto/${p.slug}`} className="self-center font-bold text-ink-500 hover:underline">Cancelar</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
