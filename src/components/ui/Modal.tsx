// Diálogo modal accesible basado en <dialog> nativo (foco y tecla Escape incluidos).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className={`m-auto w-[calc(100%-2rem)] ${size === 'lg' ? 'max-w-3xl' : 'max-w-lg'} rounded-3xl border border-ink-100 p-0 shadow-2xl backdrop:bg-ink-900/40`}
      aria-labelledby="modal-title"
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h2 id="modal-title" className="text-xl">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-ink-100" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  /** Si se indica, se pide un texto (p. ej. motivo) obligatorio. */
  reasonLabel?: string;
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger, reasonLabel, onConfirm, onClose }: ConfirmProps) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const invalid = !!reasonLabel && reason.trim().length < 3;
  return (
    <Modal
      open={open}
      title={title}
      onClose={() => { if (!busy) { setReason(''); onClose(); } }}
      footer={
        <>
          <Button variant="secondary" onClick={() => { setReason(''); onClose(); }} disabled={busy}>Volver</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={busy}
            disabled={invalid}
            onClick={async () => {
              setBusy(true);
              try { await onConfirm(reason.trim()); setReason(''); } finally { setBusy(false); }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-ink-700">
        <div>{message}</div>
        {reasonLabel && (
          <div>
            <label htmlFor="confirm-reason" className="label">{reasonLabel}</label>
            <textarea id="confirm-reason" className="input min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          </div>
        )}
      </div>
    </Modal>
  );
}
