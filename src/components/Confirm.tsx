import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Diálogo de confirmação global: `if (await confirm({...})) excluir()`. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(undefined);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = undefined;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={options !== null}
        title={options?.title ?? ''}
        onClose={() => finish(false)}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => finish(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn--danger" onClick={() => finish(true)} autoFocus>
              {options?.confirmLabel ?? 'Excluir'}
            </button>
          </>
        }
      >
        {options?.message && <p className="muted">{options.message}</p>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>');
  return ctx;
}
