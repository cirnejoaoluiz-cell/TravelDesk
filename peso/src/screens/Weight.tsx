import { useMemo, useState } from 'react';
import { Card, Segmented } from '../components/ui';
import { KCAL_PER_KG, dayBalance, movingAverage7, planEndDate, projectedWeight, sortedWeighIns } from '../lib/calc';
import { addDays, daysBetween, formatShort, today } from '../lib/dates';
import { fmt0, fmt1, fmt2 } from '../lib/format';
import { useStore } from '../lib/store';
import type { WeighIn } from '../lib/types';
import { WeightSheet } from './WeightSheet';

export function Weight() {
  const { data } = useStore();
  const p = data.profile!;
  const [edit, setEdit] = useState<WeighIn | 'new' | null>(null);
  const [range, setRange] = useState<'30' | 'plano'>('30');
  const now = today();
  const weighIns = sortedWeighIns(data.weighIns);
  const ma = movingAverage7(data.weighIns);
  const end = planEndDate(p);

  // Peso previsto pelo déficit acumulado, dia a dia, desde o início do plano.
  const predicted = useMemo(() => {
    const out: { date: string; kg: number; cum: number }[] = [];
    let cum = 0;
    const last = now < end ? now : end;
    for (let d = p.startDate; d <= last; d = addDays(d, 1)) {
      cum += dayBalance(data, d).deficit;
      out.push({ date: d, kg: p.startWeightKg - cum / KCAL_PER_KG, cum });
    }
    return out;
  }, [data, p, now, end]);

  const lastMa = ma.at(-1);
  const lastPred = lastMa ? predicted.find((x) => x.date === lastMa.date) ?? predicted.at(-1) : predicted.at(-1);
  const realLoss = lastMa ? p.startWeightKg - lastMa.kg : null;
  const predLoss = lastPred ? lastPred.cum / KCAL_PER_KG : 0;
  const planLoss = p.startWeightKg - projectedWeight(p, lastMa?.date ?? now);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Peso</h1>
        <button className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white active:bg-emerald-700" onClick={() => setEdit('new')}>+ Peso</button>
      </div>

      <Card>
        <div className="mb-3">
          <Segmented options={[{ value: '30', label: 'Últimos 30 dias' }, { value: 'plano', label: 'Plano todo' }]} value={range} onChange={setRange} />
        </div>
        {(() => {
          const first = weighIns[0]?.date ?? p.startDate;
          const lastW = weighIns.at(-1)?.date ?? now;
          let cStart = first < p.startDate ? first : p.startDate;
          let cEnd = lastW > end ? lastW : end;
          if (range === '30') {
            const from = addDays(now, -30);
            cStart = cStart > from ? cStart : from;
            const to = addDays(now, 7);
            cEnd = (lastW > to ? lastW : to) < cEnd ? (lastW > to ? lastW : to) : cEnd;
          }
          const inR = (x: { date: string }) => x.date >= cStart && x.date <= cEnd;
          return (
            <Chart
              start={cStart}
              end={cEnd}
              points={weighIns.filter(inR)}
              ma={ma.filter(inR)}
              predicted={predicted.filter(inR)}
              goal={[...new Set([cStart, p.startDate, end, cEnd])].filter((d) => d >= cStart && d <= cEnd).sort().map((d) => ({ date: d, kg: projectedWeight(p, d) }))}
              todayISO={now}
            />
          );
        })()}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <Legend color="bg-slate-400" label="Pesagens" dot />
          <Legend color="bg-emerald-600" label="Média 7 dias" />
          <Legend color="bg-slate-400" label="Meta projetada" dashed />
          <Legend color="bg-amber-500" label="Previsto pelo déficit" />
        </div>
      </Card>

      <Card className="space-y-2 text-sm">
        <h2 className="font-semibold">Real × previsto{lastMa ? ` (até ${formatShort(lastMa.date)})` : ''}</h2>
        <Row label="Perdido real (média 7 dias)" value={realLoss == null ? 'sem pesagens' : `${fmt2(realLoss)} kg`} strong />
        <Row label="Previsto pelo déficit acumulado" value={`${fmt2(predLoss)} kg`} sub={`${fmt0(lastPred?.cum ?? 0)} kcal ÷ 7.700`} />
        <Row label="Previsto pela meta do plano" value={`${fmt2(planLoss)} kg`} />
        {realLoss != null && (
          <p className="rounded-xl bg-slate-50 p-3 text-slate-600">
            {Math.abs(realLoss - predLoss) < 0.5
              ? 'O peso real está acompanhando o déficit registrado. 👍'
              : realLoss > predLoss
                ? `Você perdeu ${fmt1(realLoss - predLoss)} kg a mais do que o déficit explica (água e glicogênio costumam sair rápido no começo).`
                : `Você perdeu ${fmt1(predLoss - realLoss)} kg a menos do que o déficit prevê: confira porções, extras não lançados ou retenção de líquido.`}
          </p>
        )}
        <p className="text-xs text-slate-500">Meta: {fmt1(p.startWeightKg - p.goalLossKg)} kg em {formatShort(end)} ({daysBetween(now, end) > 0 ? `faltam ${daysBetween(now, end)} dias` : 'plano encerrado'}).</p>
      </Card>

      <Card className="divide-y divide-slate-100">
        {weighIns.length === 0 && <p className="text-sm text-slate-500">Nenhuma pesagem ainda.</p>}
        {[...weighIns].reverse().map((w) => {
          const m = ma.find((x) => x.date === w.date);
          return (
            <button key={w.id} onClick={() => setEdit(w)} className="flex w-full justify-between py-2 text-left active:bg-slate-50">
              <span>{formatShort(w.date)}</span>
              <span>
                <b>{fmt1(w.kg)} kg</b>
                {m && <span className="ml-2 text-xs text-slate-500">média {fmt1(m.kg)}</span>}
              </span>
            </button>
          );
        })}
      </Card>

      {edit && <WeightSheet date={now} entry={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function Row({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-600">{label}{sub && <span className="block text-xs text-slate-400">{sub}</span>}</span>
      <span className={strong ? 'font-semibold text-emerald-700' : 'font-medium'}>{value}</span>
    </div>
  );
}

function Legend({ color, label, dot, dashed }: { color: string; label: string; dot?: boolean; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      {dot ? <span className={`h-2 w-2 rounded-full ${color}`} /> : <span className={`h-0.5 w-4 ${dashed ? 'border-t-2 border-dashed border-slate-400' : color}`} />}
      {label}
    </span>
  );
}

interface Pt { date: string; kg: number }

function Chart({ start, end, points, ma, predicted, goal, todayISO }: {
  start: string; end: string; points: Pt[]; ma: Pt[]; predicted: Pt[]; goal: Pt[]; todayISO: string;
}) {
  const W = 340, H = 220, L = 34, R = 8, T = 10, B = 22;
  const all = [...points, ...ma, ...predicted, ...goal].map((x) => x.kg);
  let lo = Math.floor(Math.min(...all) - 0.5);
  let hi = Math.ceil(Math.max(...all) + 0.5);
  if (hi - lo < 2) { lo -= 1; hi += 1; }
  const span = Math.max(daysBetween(start, end), 1);
  const x = (d: string) => L + (daysBetween(start, d) / span) * (W - L - R);
  const y = (kg: number) => T + ((hi - kg) / (hi - lo)) * (H - T - B);
  const path = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
  const step = Math.max(1, Math.ceil((hi - lo) / 5));
  const yTicks: number[] = [];
  for (let v = Math.ceil(lo); v <= hi; v += step) yTicks.push(v);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => addDays(start, Math.round(span * f)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfico de peso">
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
          <text x={L - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#64748b">{v}</text>
        </g>
      ))}
      {xTicks.map((d, i) => (
        <text key={i} x={x(d)} y={H - 6} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'} fontSize="9" fill="#64748b">{formatShort(d)}</text>
      ))}
      {todayISO >= start && todayISO <= end && <line x1={x(todayISO)} x2={x(todayISO)} y1={T} y2={H - B} stroke="#cbd5e1" strokeDasharray="2 3" />}
      <path d={path(goal)} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 4" />
      {predicted.length > 1 && <path d={path(predicted)} fill="none" stroke="#f59e0b" strokeWidth="1.5" />}
      {points.map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r="2.5" fill="#94a3b8" />)}
      {ma.length > 1 && <path d={path(ma)} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" />}
      {ma.length === 1 && <circle cx={x(ma[0].date)} cy={y(ma[0].kg)} r="3.5" fill="#059669" />}
    </svg>
  );
}
