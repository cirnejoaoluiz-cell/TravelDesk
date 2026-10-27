interface ProgressBarProps {
  /** 0–1 (valores acima de 1 aparecem cheios, no tom de alerta). */
  value: number;
  label?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

export function ProgressBar({ value, label, tone = 'default' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={`progress progress--${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <div className="progress__bar" style={{ width: `${pct}%` }} />
    </div>
  );
}
