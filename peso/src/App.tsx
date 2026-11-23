import { useState } from 'react';
import { today } from './lib/dates';
import { useStore } from './lib/store';
import { uid } from './lib/format';
import { ProfileForm } from './screens/ProfileForm';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';
import { Week } from './screens/Week';
import { Weight } from './screens/Weight';

type Tab = 'hoje' | 'semana' | 'peso' | 'ajustes';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hoje', label: 'Hoje', icon: '📅' },
  { id: 'semana', label: 'Semana', icon: '📊' },
  { id: 'peso', label: 'Peso', icon: '⚖️' },
  { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
];

export function App() {
  const { data, update } = useStore();
  const [tab, setTab] = useState<Tab>('hoje');
  const [date, setDate] = useState(today());

  if (!data.profile) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pt-4">
          <h1 className="text-2xl font-bold text-emerald-700">Déficit</h1>
          <p className="text-slate-600">Vamos montar sua meta. Dá para editar depois em Ajustes.</p>
        </div>
        <ProfileForm
          onSave={(p) =>
            update((d) => ({
              ...d,
              profile: p,
              weighIns: d.weighIns.some((w) => w.date === p.startDate)
                ? d.weighIns
                : [...d.weighIns, { id: uid(), date: p.startDate, kg: p.startWeightKg }],
            }))
          }
        />
      </main>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <main className="space-y-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">
        {tab === 'hoje' && <Today date={date} setDate={setDate} />}
        {tab === 'semana' && <Week onOpenDay={(d) => { setDate(d); setTab('hoje'); }} />}
        {tab === 'peso' && <Weight />}
        {tab === 'ajustes' && <Settings />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id === 'hoje' && tab === 'hoje') setDate(today());
              }}
              className={`flex flex-col items-center py-2 text-xs font-medium ${tab === t.id ? 'text-emerald-700' : 'text-slate-500'}`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
