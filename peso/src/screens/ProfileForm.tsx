import { useState } from 'react';
import { Button, Card, Field, NumInput, Segmented, inputCls } from '../components/ui';
import { baseExpenditure, bmr, planEndDate, planTargets } from '../lib/calc';
import { formatShort, today } from '../lib/dates';
import { fmt0, fmt1, fmt2 } from '../lib/format';
import type { Profile, Sex } from '../lib/types';

export function ProfileForm({ initial, onSave, onCancel }: { initial?: Profile | null; onSave: (p: Profile) => void; onCancel?: () => void }) {
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'M');
  const [age, setAge] = useState(initial?.age ?? NaN);
  const [height, setHeight] = useState(initial?.heightCm ?? NaN);
  const [weight, setWeight] = useState(initial?.startWeightKg ?? NaN);
  const [loss, setLoss] = useState(initial?.goalLossKg ?? NaN);
  const [weeks, setWeeks] = useState(initial?.weeks ?? NaN);
  const [startDate, setStartDate] = useState(initial?.startDate ?? today());

  const valid = age > 0 && height > 0 && weight > 0 && loss > 0 && weeks > 0 && !!startDate;
  const profile: Profile | null = valid
    ? { sex, age, heightCm: height, startWeightKg: weight, goalLossKg: loss, weeks, startDate }
    : null;
  const t = profile && planTargets(profile);

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <Field label="Sexo">
          <Segmented options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }]} value={sex} onChange={setSex} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Idade"><NumInput value={age} onChange={setAge} suffix="anos" /></Field>
          <Field label="Altura"><NumInput value={height} onChange={setHeight} suffix="cm" /></Field>
          <Field label={initial ? 'Peso inicial' : 'Peso atual'}><NumInput value={weight} onChange={setWeight} suffix="kg" /></Field>
          <Field label="Quero perder"><NumInput value={loss} onChange={setLoss} suffix="kg" /></Field>
          <Field label="Em quantas semanas"><NumInput value={weeks} onChange={setWeeks} suffix="sem" /></Field>
          <Field label="Início do plano">
            <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
        </div>
      </Card>

      {profile && t && (
        <Card className="space-y-2 text-sm">
          <Row label="TMB (Mifflin-St Jeor)" value={`${fmt0(bmr(sex, weight, height, age))} kcal`} />
          <Row label="Gasto base (TMB × 1,3)" value={`${fmt0(baseExpenditure(profile, weight))} kcal/dia`} />
          <p className="text-xs text-slate-500 dark:text-slate-400">Exercício é somado à parte, em cada treino.</p>
          <hr className="border-slate-200 dark:border-slate-800" />
          <Row label={`Déficit total (${fmt1(loss)} kg × 7.700)`} value={`${fmt0(t.totalKcal)} kcal`} />
          <Row label="Meta semanal" value={`${fmt0(t.weekly)} kcal`} strong />
          <Row label="Meta diária" value={`${fmt0(t.daily)} kcal`} strong />
          <Row label="Ritmo" value={`${fmt2(t.kgPerWeek)} kg/sem (${fmt2(t.pctPerWeek)}% do peso)`} />
          <Row label="Fim do plano" value={formatShort(planEndDate(profile))} />
          {t.tooFast && (
            <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-950 p-3 text-amber-900 dark:text-amber-200 ring-1 ring-amber-200 dark:ring-amber-800">
              ⚠️ A meta passa de 1% do peso corporal por semana ({fmt2(t.pctPerWeek)}%). Ritmos acima disso tendem a
              custar massa muscular e são difíceis de manter. Considere mais semanas.
            </div>
          )}
        </Card>
      )}

      <div className="flex gap-3">
        {onCancel && <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancelar</Button>}
        <Button className="flex-1" disabled={!profile} onClick={() => profile && onSave(profile)}>
          {initial ? 'Salvar' : 'Começar'}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className={strong ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'font-medium'}>{value}</span>
    </div>
  );
}
