import { useMemo, useState } from 'react';
import { Button, NumInput, Segmented, Sheet, inputCls } from '../components/ui';
import { foodValues } from '../lib/calc';
import { fmt0, fmt1, uid } from '../lib/format';
import { useStore } from '../lib/store';
import type { Favorite, Meal, MealItem, MealType } from '../lib/types';
import { FoodForm } from './FoodForm';

export const MEAL_TYPES: MealType[] = ['cafe', 'almoco', 'jantar', 'extra'];
export const MEAL_LABEL: Record<MealType, string> = { cafe: 'Café da manhã', almoco: 'Almoço', jantar: 'Jantar', extra: 'Extra' };
const SHORT_LABEL: Record<MealType, string> = { ...MEAL_LABEL, cafe: 'Café' };
const MEAL_OPTIONS = MEAL_TYPES.map((v) => ({ value: v, label: SHORT_LABEL[v] }));

interface Draft { key: string; foodId: string; grams: number }

function defaultType(): MealType {
  const h = new Date().getHours();
  return h < 10 ? 'cafe' : h < 16 ? 'almoco' : h < 22 ? 'jantar' : 'extra';
}

export function MealSheet({ date, meal, onClose }: { date: string; meal?: Meal; onClose: () => void }) {
  const { data, update } = useStore();
  const foods = useMemo(() => [...data.foods].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [data.foods]);
  const [type, setType] = useState<MealType>(meal?.type ?? defaultType());
  const [drafts, setDrafts] = useState<Draft[]>(
    meal ? meal.items.map((i) => ({ key: i.id, foodId: i.foodId, grams: i.grams })) : [{ key: uid(), foodId: '', grams: NaN }],
  );
  const [favName, setFavName] = useState('');
  const [saveFav, setSaveFav] = useState(false);
  const [newFoodFor, setNewFoodFor] = useState<string | null>(null);

  const foodById = (id: string) => data.foods.find((f) => f.id === id);

  const items: MealItem[] = drafts.flatMap((d) => {
    const f = foodById(d.foodId);
    if (!f || !(d.grams > 0)) return [];
    const v = foodValues(f, d.grams);
    return [{ id: d.key, foodId: f.id, name: f.name, grams: d.grams, ...v }];
  });
  const total = items.reduce((a, i) => ({ kcal: a.kcal + i.kcal, prot: a.prot + i.prot }), { kcal: 0, prot: 0 });

  const setDraft = (key: string, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  function save() {
    const m: Meal = { id: meal?.id ?? uid(), date, type, items };
    update((d) => {
      const meals = meal ? d.meals.map((x) => (x.id === meal.id ? m : x)) : [...d.meals, m];
      const favorites =
        saveFav && favName.trim()
          ? [...d.favorites, { id: uid(), name: favName.trim(), type, items: items.map((i) => ({ foodId: i.foodId, grams: i.grams })) }]
          : d.favorites;
      return { ...d, meals, favorites };
    });
    onClose();
  }

  function launchFavorite(f: Favorite) {
    const its: MealItem[] = f.items.flatMap((it) => {
      const food = foodById(it.foodId);
      return food ? [{ id: uid(), foodId: food.id, name: food.name, grams: it.grams, ...foodValues(food, it.grams) }] : [];
    });
    update((d) => ({ ...d, meals: [...d.meals, { id: uid(), date, type, items: its, favoriteName: f.name }] }));
    onClose();
  }

  function remove() {
    if (!meal || !confirm('Apagar esta refeição?')) return;
    update((d) => ({ ...d, meals: d.meals.filter((x) => x.id !== meal.id) }));
    onClose();
  }

  return (
    <Sheet title={meal ? 'Editar refeição' : 'Nova refeição'} onClose={onClose}>
      <div className="space-y-4">
        <Segmented options={MEAL_OPTIONS} value={type} onChange={setType} />

        {!meal && data.favorites.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Favoritas — um toque lança no {MEAL_LABEL[type].toLowerCase()}</p>
            <div className="flex flex-wrap gap-2">
              {data.favorites.map((f) => {
                const k = f.items.reduce((a, it) => {
                  const food = foodById(it.foodId);
                  return a + (food ? foodValues(food, it.grams).kcal : 0);
                }, 0);
                return (
                  <button key={f.id} onClick={() => launchFavorite(f)} className="rounded-xl bg-emerald-50 dark:bg-emerald-950 px-3 py-2 text-left text-sm ring-1 ring-emerald-200 dark:ring-emerald-800 active:bg-emerald-100 dark:active:bg-emerald-900">
                    <span className="block font-medium text-emerald-900 dark:text-emerald-200">⭐ {f.name}</span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">{fmt0(k)} kcal</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {drafts.map((d) => {
            const f = foodById(d.foodId);
            const v = f && d.grams > 0 ? foodValues(f, d.grams) : null;
            return (
              <div key={d.key} className="space-y-2 rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-800">
                <div className="flex gap-2">
                  <select
                    className={`${inputCls} flex-1`}
                    value={d.foodId}
                    onChange={(e) => (e.target.value === '__new' ? setNewFoodFor(d.key) : setDraft(d.key, { foodId: e.target.value }))}
                  >
                    <option value="">Escolha o alimento…</option>
                    {foods.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                    <option value="__new">+ Cadastrar novo alimento</option>
                  </select>
                  <button className="px-2 text-xl text-slate-400 dark:text-slate-500" aria-label="Remover item" onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}>
                    ×
                  </button>
                </div>
                {newFoodFor === d.key && (
                  <FoodForm
                    onCancel={() => setNewFoodFor(null)}
                    onSave={(food) => {
                      update((s) => ({ ...s, foods: [...s.foods, food] }));
                      setDraft(d.key, { foodId: food.id });
                      setNewFoodFor(null);
                    }}
                  />
                )}
                <div className="flex items-center gap-2">
                  <NumInput className="w-32" value={d.grams} onChange={(n) => setDraft(d.key, { grams: n })} suffix="g" placeholder="Gramas" />
                  {f?.portions?.map((p) => (
                    <button
                      key={p.label}
                      className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 active:bg-slate-200 dark:active:bg-slate-700"
                      onClick={() => setDraft(d.key, { grams: (d.grams > 0 ? d.grams : 0) + p.grams })}
                    >
                      +{p.label} ({p.grams} g)
                    </button>
                  ))}
                  <span className="ml-auto text-right text-sm text-slate-600 dark:text-slate-300">
                    {v ? <>{fmt0(v.kcal)} kcal<br /><span className="text-xs">{fmt1(v.prot)} g P</span></> : '—'}
                  </span>
                </div>
              </div>
            );
          })}
          <Button variant="secondary" className="w-full" onClick={() => setDrafts((ds) => [...ds, { key: uid(), foodId: '', grams: NaN }])}>
            + Adicionar item
          </Button>
        </div>

        <div className="flex justify-between rounded-2xl bg-slate-800 px-4 py-3 text-white">
          <span>Total</span>
          <span className="font-semibold">{fmt0(total.kcal)} kcal · {fmt1(total.prot)} g proteína</span>
        </div>

        {!meal && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={saveFav} onChange={(e) => setSaveFav(e.target.checked)} />
              Salvar também como refeição favorita
            </label>
            {saveFav && <input className={inputCls} placeholder="Nome da favorita (ex.: Frango com arroz)" value={favName} onChange={(e) => setFavName(e.target.value)} />}
          </div>
        )}

        <div className="flex gap-3">
          {meal && <Button variant="danger" onClick={remove}>Apagar</Button>}
          <Button className="flex-1" disabled={items.length === 0 || (saveFav && !favName.trim())} onClick={save}>
            Salvar refeição
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
