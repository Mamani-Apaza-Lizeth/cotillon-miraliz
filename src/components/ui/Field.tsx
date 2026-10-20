// Campos de formulario accesibles: etiqueta asociada, ayuda y mensaje de error.
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface WrapperProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (ids: { id: string; describedBy?: string }) => ReactNode;
  className?: string;
}

function FieldWrapper({ label, error, hint, children, className = '' }: WrapperProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      {children({ id, describedBy })}
      {hint && <p id={hintId} className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p id={errorId} className="mt-1 text-xs font-bold text-rose-600" role="alert">{error}</p>}
    </div>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export function InputField({ label, error, hint, wrapperClassName, className = '', ...rest }: InputFieldProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} className={wrapperClassName}>
      {({ id, describedBy }) => (
        <input id={id} aria-invalid={!!error || undefined} aria-describedby={describedBy}
          className={`input ${error ? 'input-error' : ''} ${className}`} {...rest} />
      )}
    </FieldWrapper>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export function TextAreaField({ label, error, hint, wrapperClassName, className = '', ...rest }: TextAreaFieldProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} className={wrapperClassName}>
      {({ id, describedBy }) => (
        <textarea id={id} aria-invalid={!!error || undefined} aria-describedby={describedBy}
          className={`input min-h-24 ${error ? 'input-error' : ''} ${className}`} {...rest} />
      )}
    </FieldWrapper>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export function SelectField({ label, error, hint, wrapperClassName, className = '', children, ...rest }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} className={wrapperClassName}>
      {({ id, describedBy }) => (
        <select id={id} aria-invalid={!!error || undefined} aria-describedby={describedBy}
          className={`input ${error ? 'input-error' : ''} ${className}`} {...rest}>
          {children}
        </select>
      )}
    </FieldWrapper>
  );
}

export function Checkbox({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-700">
      <input type="checkbox" className="h-4 w-4 rounded accent-brand-600" {...rest} />
      {label}
    </label>
  );
}
