import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  /** Use para grupos de botões: renderiza <div> em vez de <label>. */
  group?: boolean;
}

export function Field({ label, hint, error, children, className = '', group = false }: FieldProps) {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className={`field ${error ? 'field--error' : ''} ${className}`}>
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error">{error}</span> : hint && <span className="field__hint">{hint}</span>}
    </Tag>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input input--textarea" rows={3} {...props} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className="input input--select" {...props}>
      {children}
    </select>
  );
}

/** Grade de campos lado a lado que empilha no celular. */
export function FieldRow({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`field-row field-row--${cols}`}>{children}</div>;
}
