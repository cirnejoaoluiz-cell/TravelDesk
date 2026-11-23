import { useState } from 'react';
import { Button, Field, NumInput, inputCls } from '../components/ui';
import { uid } from '../lib/format';
import type { Food } from '../lib/types';

export function FoodForm({ initial, onSave, onCancel }: { initial?: Food; onSave: (f: Food) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [kcal, setKcal] = useState(initial?.kcal100 ?? NaN);
  const [prot, setProt] = useState(initial?.prot100 ?? NaN);
  const [pLabel, setPLabel] = useState(initial?.portions?.[0]?.label ?? '');
  const [pGrams, setPGrams] = useState(initial?.portions?.[0]?.grams ?? NaN);
  const valid = name.trim() && kcal >= 0 && prot >= 0;

  return (
    <div className="space-y-3 rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-800">
      <Field label="Nome"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ovo cozido" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="kcal / 100 g"><NumInput value={kcal} onChange={setKcal} /></Field>
        <Field label="Proteína / 100 g"><NumInput value={prot} onChange={setProt} suffix="g" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Atalho (opcional)"><input className={inputCls} value={pLabel} onChange={(e) => setPLabel(e.target.value)} placeholder="1 unidade" /></Field>
        <Field label="Gramas do atalho"><NumInput value={pGrams} onChange={setPGrams} suffix="g" /></Field>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button
          className="flex-1"
          disabled={!valid}
          onClick={() =>
            onSave({
              id: initial?.id ?? uid(),
              name: name.trim(),
              kcal100: kcal,
              prot100: prot,
              portions: pLabel.trim() && pGrams > 0 ? [{ label: pLabel.trim(), grams: pGrams }] : undefined,
            })
          }
        >
          Salvar alimento
        </Button>
      </div>
    </div>
  );
}
