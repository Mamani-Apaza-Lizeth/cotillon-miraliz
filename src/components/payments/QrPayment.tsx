// Flujo de pago QR. El contador solo muestra el tiempo y programa la próxima
// consulta (cada 10 s); NUNCA aprueba el pago. "Pago concretado con éxito" se
// muestra únicamente cuando la base de datos informa el estado 'aprobado'.
import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Feedback';
import { useToast } from '../../context/ToastContext';
import { cancelPaymentAttempt, createPaymentAttempt, getPaymentStatus } from '../../services/payments';
import { errorMessage } from '../../lib/errors';
import { formatMoney } from '../../lib/format';
import { newIdempotencyKey } from '../../lib/idempotency';
import { qrPhaseFromStatus as phaseFromStatus, type QrPhase as Phase } from '../../lib/rules';
import type { Order, Payment } from '../../types/db';

const POLL_SECONDS = 10;

export function QrPayment({ order, amount, onDone, onBack }: { order: Order; amount: number; onDone: (ok: boolean) => void; onBack: () => void }) {
  const toast = useToast();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [phase, setPhase] = useState<Phase>('creando');
  const [message, setMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [nextPoll, setNextPoll] = useState(POLL_SECONDS);
  const key = useRef(newIdempotencyKey('qr'));
  const finished = useRef(false);

  const start = useCallback(async () => {
    setPhase('creando');
    setMessage(null);
    finished.current = false;
    try {
      const p = await createPaymentAttempt(order.id, 'qr', amount, key.current);
      setPayment(p);
      setPhase(phaseFromStatus(p.status));
    } catch (e) {
      setPhase('error');
      setMessage(errorMessage(e));
    }
  }, [order.id, amount]);

  // Evita crear dos intentos cuando React monta el efecto dos veces (modo estricto).
  const startedKey = useRef<string | null>(null);
  useEffect(() => {
    if (startedKey.current === key.current) return;
    startedKey.current = key.current;
    void start();
  }, [start]);

  const check = useCallback(async () => {
    if (!payment || finished.current) return;
    try {
      const s = await getPaymentStatus(payment.id);
      const ph = phaseFromStatus(s.status);
      setPhase(ph);
      if (s.error_message) setMessage(s.error_message);
      if (ph === 'verificado') {
        finished.current = true;
        toast.success('Pago concretado con éxito.');
        onDone(true);
      } else if (ph !== 'esperando') {
        finished.current = true;
      }
    } catch (e) {
      setPhase('error');
      setMessage(`Error de verificación: ${errorMessage(e)}`);
    }
  }, [payment, onDone, toast]);

  // Reloj: actualiza el tiempo restante y consulta el estado cada 10 segundos.
  useEffect(() => {
    if (phase !== 'esperando' || !payment?.expires_at) return;
    const expires = new Date(payment.expires_at).getTime();
    const tick = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((expires - Date.now()) / 1000)));
      setNextPoll((n) => {
        if (n <= 1) { void check(); return POLL_SECONDS; }
        return n - 1;
      });
    }, 1000);
    setSecondsLeft(Math.max(0, Math.round((expires - Date.now()) / 1000)));
    return () => clearInterval(tick);
  }, [phase, payment, check]);

  const cancel = async () => {
    if (payment && phase === 'esperando') await cancelPaymentAttempt(payment.id).catch(() => undefined);
    onBack();
  };

  const retry = () => {
    key.current = newIdempotencyKey('qr');
    void start();
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="space-y-4" aria-live="polite">
      <p className="text-ink-700">Monto a pagar: <strong className="font-display text-xl text-brand-700">{formatMoney(amount)}</strong> · Pedido {order.code}</p>

      {phase === 'creando' && <p className="text-ink-500" role="status">Generando código QR…</p>}

      {phase === 'esperando' && payment?.qr_payload && (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="rounded-2xl border-4 border-brand-200 bg-white p-3">
            <QRCodeSVG value={payment.qr_payload} size={196} level="M" title={`Código QR del pago del pedido ${order.code}`} />
          </div>
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 font-bold text-ink-700"><Clock className="h-5 w-5 text-sun-500" aria-hidden />Esperando pago · vence en {mm}:{ss}</p>
            <p className="text-sm text-ink-500">Próxima verificación en {nextPoll} s.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => { setNextPoll(POLL_SECONDS); void check(); }}>Verificar ahora</Button>
              <Button variant="ghost" size="sm" onClick={cancel}>Cancelar</Button>
            </div>
            {payment.environment === 'test' && (
              <Notice tone="warning">
                Pago QR de <strong>prueba</strong>: no se cobra dinero real. El administrador puede confirmarlo o rechazarlo desde
                Administración → Pedidos → {order.code}.
              </Notice>
            )}
          </div>
        </div>
      )}

      {phase === 'verificado' && (
        <Notice tone="success"><span className="inline-flex items-center gap-2 font-bold"><CheckCircle2 className="h-5 w-5" aria-hidden />Pago concretado con éxito.</span></Notice>
      )}
      {(phase === 'rechazado' || phase === 'expirado' || phase === 'cancelado' || phase === 'error') && (
        <div className="space-y-3">
          <Notice tone="danger">
            <span className="inline-flex items-center gap-2 font-bold"><XCircle className="h-5 w-5" aria-hidden />
              {phase === 'rechazado' ? 'Pago rechazado.' : phase === 'expirado' ? 'El código QR expiró sin recibir el pago.' : phase === 'cancelado' ? 'El intento de pago fue cancelado.' : 'No se pudo completar la operación.'}
            </span>
            {message && <span className="block">{message}</span>}
          </Notice>
          <div className="flex gap-2">
            <Button onClick={retry}>Generar un nuevo QR</Button>
            <Button variant="secondary" onClick={onBack}>Elegir otro método</Button>
          </div>
        </div>
      )}
    </div>
  );
}
