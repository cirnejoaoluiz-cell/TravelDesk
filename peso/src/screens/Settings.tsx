import { useRef, useState } from 'react';
import { Button, Card } from '../components/ui';
import { foodValues } from '../lib/calc';
import { fmt0, fmt1 } from '../lib/format';
import { emptyData, exportJSON, normalize, useStore } from '../lib/store';
import type { Food } from '../lib/types';
import { FoodForm } from './FoodForm';
import { MEAL_LABEL } from './MealSheet';
import { ProfileForm } from './ProfileForm';

export function Settings() {
  const { data, update, replace } = useStore();
  const [editProfile, setEditProfile] = useState(false);
  const [editFood, setEditFood] = useState<Food | 'new' | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function importFile(file: File) {
    try {
      const d = normalize(JSON.parse(await file.text()));
      if (!confirm('Substituir todos os dados atuais pelos do backup?')) return;
      replace(d);
      setMsg('Backup importado.');
    } catch (e) {
      setMsg(`Não foi possível importar: ${(e as Error).message}`);
    }
  }

  const foods = [...data.foods].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Ajustes</h1>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Perfil e meta</h2>
        {editProfile ? (
          <ProfileForm
            initial={data.profile}
            onCancel={() => setEditProfile(false)}
            onSave={(p) => {
              update((d) => ({ ...d, profile: p }));
              setEditProfile(false);
            }}
          />
        ) : (
          <Card className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {data.profile && (
                <>
                  {data.profile.sex === 'M' ? 'Masc.' : 'Fem.'}, {data.profile.age} anos, {data.profile.heightCm} cm<br />
                  {fmt1(data.profile.startWeightKg)} kg → −{fmt1(data.profile.goalLossKg)} kg em {data.profile.weeks} semanas
                </>
              )}
            </span>
            <Button variant="secondary" onClick={() => setEditProfile(true)}>Editar</Button>
          </Card>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Alimentos (por 100 g)</h2>
          <button className="text-sm font-medium text-emerald-700 dark:text-emerald-400" onClick={() => setEditFood('new')}>+ Novo</button>
        </div>
        {editFood === 'new' && (
          <FoodForm onCancel={() => setEditFood(null)} onSave={(f) => { update((d) => ({ ...d, foods: [...d.foods, f] })); setEditFood(null); }} />
        )}
        <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
          {foods.map((f) =>
            editFood !== 'new' && editFood?.id === f.id ? (
              <div key={f.id} className="p-2">
                <FoodForm
                  initial={f}
                  onCancel={() => setEditFood(null)}
                  onSave={(nf) => { update((d) => ({ ...d, foods: d.foods.map((x) => (x.id === nf.id ? nf : x)) })); setEditFood(null); }}
                />
                <Button
                  variant="danger"
                  className="mt-2 w-full"
                  onClick={() => {
                    if (!confirm(`Apagar "${f.name}"? Refeições já lançadas não mudam.`)) return;
                    update((d) => ({ ...d, foods: d.foods.filter((x) => x.id !== f.id) }));
                    setEditFood(null);
                  }}
                >
                  Apagar alimento
                </Button>
              </div>
            ) : (
              <button key={f.id} className="flex w-full justify-between px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-800" onClick={() => setEditFood(f)}>
                <span>{f.name}{f.portions?.length ? <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">({f.portions.map((p) => `${p.label} = ${p.grams} g`).join(', ')})</span> : null}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{fmt0(f.kcal100)} kcal · {fmt1(f.prot100)} g P</span>
              </button>
            ),
          )}
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Refeições favoritas</h2>
        <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
          {data.favorites.length === 0 && <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Marque “salvar como favorita” ao lançar uma refeição.</p>}
          {data.favorites.map((fav) => {
            const desc = fav.items.map((it) => {
              const food = data.foods.find((f) => f.id === it.foodId);
              return food ? { name: food.name, grams: it.grams, ...foodValues(food, it.grams) } : null;
            }).filter((x) => x !== null);
            return (
              <div key={fav.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm">
                  <b>⭐ {fav.name}</b> <span className="text-slate-500 dark:text-slate-400">· {MEAL_LABEL[fav.type]} · {fmt0(desc.reduce((a, x) => a + x.kcal, 0))} kcal</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{desc.map((x) => `${x.name} ${fmt0(x.grams)} g`).join(' · ')}</span>
                </span>
                <button
                  className="text-xl text-slate-400 dark:text-slate-500"
                  aria-label="Apagar favorita"
                  onClick={() => confirm(`Apagar a favorita "${fav.name}"?`) && update((d) => ({ ...d, favorites: d.favorites.filter((x) => x.id !== fav.id) }))}
                >
                  ×
                </button>
              </div>
            );
          })}
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Backup</h2>
        <Card className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">Os dados ficam só neste aparelho. Exporte um arquivo JSON de vez em quando para não perder nada.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => exportJSON(data)}>Exportar JSON</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>Importar JSON</Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = '';
            }}
          />
          {msg && <p className="text-sm text-slate-700 dark:text-slate-200">{msg}</p>}
          <Button
            variant="danger"
            className="w-full"
            onClick={() => confirm('Apagar TODOS os dados deste aparelho? Exporte um backup antes.') && replace(emptyData())}
          >
            Apagar todos os dados
          </Button>
        </Card>
      </section>
    </div>
  );
}
