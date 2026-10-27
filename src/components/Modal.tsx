import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose(): void;
  children: ReactNode;
  /** Quando informado, o conteúdo vira um <form> e o rodapé ganha os botões padrão. */
  onSubmit?(): void;
  submitLabel?: string;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/** Modal baseado no <dialog> nativo (foco, Esc e acessibilidade de graça). No celular vira "bottom sheet". */
export function Modal({ open, title, onClose, children, onSubmit, submitLabel = 'Salvar', footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.classList.add('no-scroll');
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) document.body.classList.remove('no-scroll');
  }, [open]);

  useEffect(() => () => document.body.classList.remove('no-scroll'), []);

  if (!open) return <dialog ref={ref} className="modal" hidden />;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.();
  };

  const body = (
    <>
      <header className="modal__header">
        <h2 className="modal__title">{title}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
      </header>
      <div className="modal__body">{children}</div>
      {(onSubmit || footer) && (
        <footer className="modal__footer">
          {footer ?? (
            <>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary">
                {submitLabel}
              </button>
            </>
          )}
        </footer>
      )}
    </>
  );

  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        // Clique no fundo escuro fecha.
        if (e.target === ref.current) onClose();
      }}
    >
      {onSubmit ? (
        <form className="modal__inner" onSubmit={handleSubmit} noValidate>
          {body}
        </form>
      ) : (
        <div className="modal__inner">{body}</div>
      )}
    </dialog>
  );
}
