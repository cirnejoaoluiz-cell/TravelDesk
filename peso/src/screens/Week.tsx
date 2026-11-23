import { useState } from 'react';
import { Card, Progress } from '../components/ui';
import { planWeekIndex, weekSummary, type DayBalance } from '../lib/calc';
import { formatShort, today, weekdayShort } from '../lib/dates';
import { fmt0 } from '../lib/format';
import { useStore } from '../lib/store';

export function Week({ onOpenDay }: { onOpenDay: (d: string) => void }) {
  const { data } = useStore();
  const p = data.profile!;
  const now = today();
  const current = Math.min(Math.max(planWeekIndex(p, now), 0), p.weeks - 1);
  const [idx, setIdx] = useState(current);
  const w = weekSummary(data, idx, now);
  const pct = w.target > 0 ? (w.accumulated / w.target) * 100 : 0;
  const past = w.daysLeft === 0;
  const future = w.start > now;
  const maxAbs = Math.max(...w.days.map((d) => Math.abs(d.deficit)), w.target / 7, 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="rounded-full px-4 py-2 text-2xl text-slate-500 disabled:opacity-30" disabled={idx <= 0} onClick={() => setIdx(idx - 1)}>‹</button>
        <div className="text-center">
          <div className="text-lg font-semibold">Semana {idx + 1} de {p.weeks}</div>
          <div className="text-xs text-slate-500">{formatShort(w.start)} – {formatShort(w.end)}</div>
        </div>
        <button className="rounded-full px-4 py-2 text-2xl text-slate-500 disabled:opacity-30" disabled={idx >= p.weeks - 1} onClick={() => setIdx(idx + 1)}>›</button>
      </div>

      <Card className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-slate-500">Déficit acumulado</div>
            <div className="text-3xl font-bold text-emerald-600">{fmt0(w.accumulated)}</div>
          </div>
          <div className="text-right text-sm text-slate-500">
            meta da semana<br /><span className="font-semibold text-slate-700">{fmt0(w.target)} kcal</span>
          </div>
        </div>
        <Progress value={w.accumulated} max={w.target} />
        <div className="text-sm text-slate-600">{fmt0(pct)}% da meta</div>
        {!past && !future && (
          <div className={`rounded-xl p-3 text-sm ${w.remaining <= 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-sky-50 text-sky-900'}`}>
            {w.remaining <= 0 ? (
              <>🎉 Meta da semana já batida com os dias encerrados.</>
            ) : (
              <>
                Faltam <b>{fmt0(w.remaining)} kcal</b> (sem contar hoje). Para bater a meta: <b>{fmt0(w.perDayNeeded)} kcal/dia</b> de déficit
                nos {w.daysLeft} dia{w.daysLeft > 1 ? 's' : ''} restantes, incluindo hoje.
              </>
            )}
          </div>
        )}
        {past && (
          <div className={`rounded-xl p-3 text-sm ${w.accumulated >= w.target ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
            {w.accumulated >= w.target ? 'Meta batida ✅' : `Ficou ${fmt0(w.target - w.accumulated)} kcal abaixo da meta.`}
          </div>
        )}
      </Card>

      <Card className="space-y-1">
        {w.days.map((d) => (
          <DayRow key={d.date} d={d} maxAbs={maxAbs} isToday={d.date === now} onClick={() => onOpenDay(d.date)} />
        ))}
      </Card>
    </div>
  );
}

function DayRow({ d, maxAbs, isToday, onClick }: { d: DayBalance; maxAbs: number; isToday: boolean; onClick: () => void }) {
  const width = Math.min(100, (Math.abs(d.deficit) / maxAbs) * 100);
  const tag =
    d.status === 'livre-estimado' ? 'livre (est.)' : d.status === 'livre-branco' ? 'livre' : d.status === 'sem-registro' ? 'sem registro' : '';
  return (
    <button onClick={onClick} className={`grid w-full grid-cols-[3.2rem_1fr_4.5rem] items-center gap-2 rounded-lg px-1 py-2 text-left active:bg-slate-100 ${isToday ? 'bg-emerald-50' : ''}`}>
      <span className="text-sm">
        <span className="font-medium capitalize">{weekdayShort(d.date)}</span>
        <span className="block text-xs text-slate-500">{formatShort(d.date)}</span>
      </span>
      <span className="relative h-5">
        {d.counts ? (
          <span className={`absolute inset-y-0 left-0 rounded ${d.deficit >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${width}%` }} />
        ) : null}
        {tag && <span className="absolute inset-y-0 left-1 flex items-center text-xs text-slate-500">{tag}</span>}
      </span>
      <span className={`text-right text-sm font-medium ${d.deficit < 0 ? 'text-red-600' : ''}`}>{d.counts ? fmt0(d.deficit) : '—'}</span>
    </button>
  );
}
