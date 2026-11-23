import { useState } from 'react';
import { Card, NumInput, Progress } from '../components/ui';
import { dayBalance, planTargets, planWeekIndex, weekSummary } from '../lib/calc';
import { addDays, formatDay, today } from '../lib/dates';
import { fmt0, fmt1, fmt2 } from '../lib/format';
import { useStore } from '../lib/store';
import type { Meal, WeighIn, Workout } from '../lib/types';
import { MEAL_LABEL, MEAL_TYPES, MealSheet } from './MealSheet';
import { WeightSheet } from './WeightSheet';
import { WORKOUT_LABEL, WorkoutSheet } from './WorkoutSheet';

type Open =
  | { kind: 'meal'; meal?: Meal }
  | { kind: 'workout'; workout?: Workout }
  | { kind: 'weight'; entry?: WeighIn }
  | null;

export function Today({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const { data, update } = useStore();
  const [open, setOpen] = useState<Open>(null);
  const p = data.profile!;
  const t = planTargets(p);
  const b = dayBalance(data, date);
  const now = today();
  const isToday = date === now;
  const meals = data.meals.filter((m) => m.date === date);
  const workouts = data.workouts.filter((w) => w.date === date);
  const weighIn = data.weighIns.find((w) => w.date === date);
  const free = data.freeDays[date];
  const week = planWeekIndex(p, date) >= 0 ? weekSummary(data, planWeekIndex(p, date), now) : null;
  const dayTarget = week && week.daysLeft > 0 && date >= now ? week.perDayNeeded : t.daily;

  const toggleFree = () =>
    update((d) => {
      const freeDays = { ...d.freeDays };
      if (freeDays[date]) delete freeDays[date];
      else freeDays[date] = {};
      return { ...d, freeDays };
    });

  const setEstimate = (n: number) =>
    update((d) => ({ ...d, freeDays: { ...d.freeDays, [date]: { estimateKcal: n >= 0 ? n : undefined } } }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="rounded-full px-4 py-2 text-2xl text-slate-500 active:bg-slate-200" onClick={() => setDate(addDays(date, -1))} aria-label="Dia anterior">‹</button>
        <button className="text-center" onClick={() => setDate(now)}>
          <div className="text-lg font-semibold capitalize">{isToday ? 'Hoje' : formatDay(date)}</div>
          <div className="text-xs text-slate-500">{isToday ? formatDay(date) : 'toque para voltar a hoje'}</div>
        </button>
        <button className="rounded-full px-4 py-2 text-2xl text-slate-500 active:bg-slate-200 disabled:opacity-30" disabled={isToday} onClick={() => setDate(addDays(date, 1))} aria-label="Próximo dia">›</button>
      </div>

      <Card className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-slate-500">Déficit do dia</div>
            <div className={`text-4xl font-bold ${!b.counts ? 'text-slate-300' : b.deficit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {b.counts ? fmt0(b.deficit) : '—'} <span className="text-base font-medium">kcal</span>
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            meta<br /><span className="font-semibold text-slate-700">{fmt0(dayTarget)} kcal</span>
          </div>
        </div>
        <Progress value={b.counts ? b.deficit : 0} max={dayTarget} />
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <Stat label="Consumido" value={b.status === 'livre-branco' ? '—' : fmt0(b.consumed)} />
          <Stat label="Gasto base" value={fmt0(b.base)} />
          <Stat label="Exercício" value={fmt0(b.exercise)} />
        </div>
        <p className="text-center text-xs text-slate-500">
          ({fmt0(b.base)} + {fmt0(b.exercise)}) − {b.status === 'livre-branco' ? 'consumo' : fmt0(b.consumed)} = déficit
          {b.status === 'sem-registro' && ' · lance uma refeição para o dia contar'}
          {b.status === 'livre-branco' && ' · dia livre em branco conta como déficit 0'}
        </p>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-600">Proteína</span>
            <span className="font-medium">{fmt0(b.protein)} / {fmt0(b.proteinGoal)} g</span>
          </div>
          <Progress value={b.protein} max={b.proteinGoal} tone="sky" />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <BigButton label="Refeição" icon="🍽️" onClick={() => setOpen({ kind: 'meal' })} />
        <BigButton label="Treino" icon="🏃" onClick={() => setOpen({ kind: 'workout' })} />
        <BigButton label="Peso" icon="⚖️" onClick={() => setOpen({ kind: 'weight', entry: weighIn })} />
      </div>

      <Card className="space-y-3">
        <label className="flex items-center justify-between">
          <span>
            <span className="font-medium">Dia livre</span>
            <span className="block text-xs text-slate-500">Lance uma estimativa ou deixe em branco</span>
          </span>
          <input type="checkbox" className="h-6 w-6 accent-emerald-600" checked={!!free} onChange={toggleFree} />
        </label>
        {free && (
          <NumInput value={free.estimateKcal ?? NaN} onChange={setEstimate} suffix="kcal estimadas" placeholder="Em branco" />
        )}
      </Card>

      {MEAL_TYPES.map((type) => {
        const ms = meals.filter((m) => m.type === type);
        if (!ms.length) return null;
        return (
          <section key={type} className="space-y-2">
            <h3 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{MEAL_LABEL[type]}</h3>
            {ms.map((m) => {
              const k = m.items.reduce((a, i) => a + i.kcal, 0);
              const pr = m.items.reduce((a, i) => a + i.prot, 0);
              return (
                <button key={m.id} className="block w-full text-left" onClick={() => setOpen({ kind: 'meal', meal: m })}>
                  <Card className="active:bg-slate-50">
                    <div className="flex justify-between font-medium">
                      <span>{m.favoriteName ? `⭐ ${m.favoriteName}` : MEAL_LABEL[m.type]}</span>
                      <span>{fmt0(k)} kcal · {fmt0(pr)} g P</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{m.items.map((i) => `${i.name} ${fmt0(i.grams)} g`).join(' · ')}</div>
                  </Card>
                </button>
              );
            })}
          </section>
        );
      })}

      {workouts.length > 0 && (
        <section className="space-y-2">
          <h3 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Treinos</h3>
          {workouts.map((w) => (
            <button key={w.id} className="block w-full text-left" onClick={() => setOpen({ kind: 'workout', workout: w })}>
              <Card className="flex justify-between active:bg-slate-50">
                <span className="font-medium">{WORKOUT_LABEL[w.kind]} · {fmt0(w.minutes)} min{w.km ? ` · ${fmt2(w.km)} km` : ''}</span>
                <span>{fmt0(w.kcal)} kcal</span>
              </Card>
            </button>
          ))}
        </section>
      )}

      {weighIn && (
        <button className="block w-full text-left" onClick={() => setOpen({ kind: 'weight', entry: weighIn })}>
          <Card className="flex justify-between active:bg-slate-50">
            <span className="font-medium">⚖️ Pesagem em jejum</span>
            <span>{fmt1(weighIn.kg)} kg</span>
          </Card>
        </button>
      )}

      {open?.kind === 'meal' && <MealSheet date={date} meal={open.meal} onClose={() => setOpen(null)} />}
      {open?.kind === 'workout' && <WorkoutSheet date={date} workout={open.workout} onClose={() => setOpen(null)} />}
      {open?.kind === 'weight' && <WeightSheet date={date} entry={open.entry} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function BigButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-600 py-5 text-white shadow-sm active:scale-[0.97] active:bg-emerald-700">
      <span className="text-2xl">{icon}</span>
      <span className="font-semibold">+ {label}</span>
    </button>
  );
}
