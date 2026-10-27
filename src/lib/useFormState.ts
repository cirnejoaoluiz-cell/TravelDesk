import { useCallback, useState } from 'react';

/** Estado simples de formulário com atualização campo a campo. */
export function useFormState<T extends object>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);
  return { values, setField, setValues };
}
