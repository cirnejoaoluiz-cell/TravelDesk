import { useEffect, useState, type ReactNode } from 'react';
import { parseNum } from '../lib/format';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 ${className}`}>{children}</div>;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 dark:bg-black/60" onClick={onClose}>
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-slate-50 dark:bg-slate-950 pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 dark:text-slate-400" aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<BtnVariant, string> = {
  primary: 'bg-emerald-600 text-white active:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700',
  secondary: 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 ring-1 ring-slate-300 dark:ring-slate-700 active:bg-slate-100 dark:active:bg-slate-800',
  danger: 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900 active:bg-red-50 dark:active:bg-red-950',
  ghost: 'text-emerald-700 dark:text-emerald-400 active:bg-emerald-50 dark:active:bg-emerald-950',
};

export function Button({
  children, onClick, variant = 'primary', className = '', disabled, type = 'button',
}: {
  children: ReactNode; onClick?: () => void; variant?: BtnVariant; className?: string; disabled?: boolean; type?: 'button' | 'submit';
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`rounded-xl px-4 py-3 font-medium transition ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

/** Campo numérico que aceita vírgula. Chama onChange com NaN se vazio/inválido. */
export function NumInput({
  value, onChange, placeholder, suffix, className = '', autoFocus,
}: {
  value: number; onChange: (n: number) => void; placeholder?: string; suffix?: string; className?: string; autoFocus?: boolean;
}) {
  const [text, setText] = useState(Number.isFinite(value) ? String(value).replace('.', ',') : '');
  useEffect(() => {
    // Sincroniza quando o valor muda de fora (ex.: botão de porção).
    if (parseNum(text) !== value) setText(Number.isFinite(value) ? String(value).replace('.', ',') : '');
  }, [value]);
  return (
    <div className={`flex items-center rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-300 dark:ring-slate-700 focus-within:ring-2 focus-within:ring-emerald-500 ${className}`}>
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        className="w-full min-w-0 rounded-xl bg-transparent px-3 py-2.5 outline-none"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseNum(e.target.value));
        }}
      />
      {suffix && <span className="pr-3 text-sm text-slate-500 dark:text-slate-400">{suffix}</span>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-slate-200 dark:bg-slate-800 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium ${value === o.value ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, max, tone = 'emerald' }: { value: number; max: number; tone?: 'emerald' | 'sky' | 'amber' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const color = { emerald: 'bg-emerald-500', sky: 'bg-sky-500', amber: 'bg-amber-500' }[tone];
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export const inputCls = 'w-full rounded-xl bg-white dark:bg-slate-900 px-3 py-2.5 ring-1 ring-slate-300 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500';
