import { useState } from 'react';
import { Button, Field, NumInput, Sheet, inputCls } from '../components/ui';
import { weightOn } from '../lib/calc';
import { uid } from '../lib/format';
import { useStore } from '../lib/store';
import type { WeighIn } from '../lib/types';

export function WeightSheet({ date, entry, onClose }: { date: string; entry?: WeighIn; onClose: () => void }) {
  const { data, update } = useStore();
  const [d, setD] = useState(entry?.date ?? date);
  const [kg, setKg] = useState(entry?.kg ?? NaN);
  const existing = data.weighIns.find((w) => w.date === d && w.id !== entry?.id);

  function save() {
    update((s) => {
      // Uma pesagem por dia: substitui a do mesmo dia.
      const rest = s.weighIns.filter((w) => w.id !== entry?.id && w.date !== d);
      return { ...s, weighIns: [...rest, { id: entry?.id ?? uid(), date: d, kg }] };
    });
    onClose();
  }

  function remove() {
    if (!entry || !confirm('Apagar esta pesagem?')) return;
    update((s) => ({ ...s, weighIns: s.weighIns.filter((w) => w.id !== entry.id) }));
    onClose();
  }

  return (
    <Sheet title={entry ? 'Editar pesagem' : 'Registrar peso'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Peso em jejum" hint={`Última referência: ${weightOn(data, d).toString().replace('.', ',')} kg`}>
          <NumInput value={kg} onChange={setKg} suffix="kg" autoFocus />
        </Field>
        <Field label="Data">
          <input type="date" className={inputCls} value={d} onChange={(e) => setD(e.target.value)} />
        </Field>
        {existing && <p className="text-sm text-amber-700 dark:text-amber-400">Já existe pesagem nesse dia ({existing.kg} kg); ela será substituída.</p>}
        <div className="flex gap-3">
          {entry && <Button variant="danger" onClick={remove}>Apagar</Button>}
          <Button className="flex-1" disabled={!(kg > 20 && kg < 400) || !d} onClick={save}>Salvar</Button>
        </div>
      </div>
    </Sheet>
  );
}
