import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <h3 className="empty__title">{title}</h3>
      {text && <p className="empty__text">{text}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}
