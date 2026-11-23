import { useState } from 'react';
import { Button, Field, NumInput, Segmented, Sheet } from '../components/ui';
import { MET, intervalSegments, metKcal, treadmillMet, treadmillSummary, weightOn } from '../lib/calc';
import { fmt0, fmt1, fmt2, uid } from '../lib/format';
import { useStore } from '../lib/store';
import type { Segment, Workout, WorkoutKind } from '../lib/types';

export const WORKOUT_LABEL: Record<WorkoutKind, string> = { musculacao: 'Musculação', esteira: 'Esteira', futebol: 'Futebol' };

interface Row extends Segment { key: string }

const PRESETS = [
  { label: 'Intervalado 7/3', walk: 7, run: 3 },
  { label: 'Intervalado 8/2', walk: 8, run: 2 },
];

export function WorkoutSheet({ date, workout, onClose }: { date: string; workout?: Workout; onClose: () => void }) {
  const { data, update } = useStore();
  const weight = workout?.weightKg ?? weightOn(data, date);
  const [kind, setKind] = useState<WorkoutKind>(workout?.kind ?? 'musculacao');
  const [minutes, setMinutes] = useState(workout && workout.kind !== 'esteira' ? workout.minutes : NaN);
  const [rows, setRows] = useState<Row[]>(
    workout?.segments?.map((s) => ({ ...s, key: uid() })) ?? [{ key: uid(), speed: NaN, minutes: NaN }],
  );
  const [walkMin, setWalkMin] = useState(7);
  const [runMin, setRunMin] = useState(3);
  const [walkSpeed, setWalkSpeed] = useState(6.5);
  const [runSpeed, setRunSpeed] = useState(10);
  const [targetKm, setTargetKm] = useState(10);

  const tm = treadmillSummary(rows, weight);
  const simpleKcal = kind === 'esteira' ? 0 : metKcal(MET[kind], weight, minutes > 0 ? minutes : 0);
  const kcal = kind === 'esteira' ? tm.kcal : simpleKcal;
  const valid = kind === 'esteira' ? tm.minutes > 0 : minutes > 0;

  function generate(walk = walkMin, run = runMin) {
    setRows(intervalSegments(walk, run, walkSpeed, runSpeed, targetKm).map((s) => ({ ...s, key: uid() })));
  }

  function save() {
    const w: Workout =
      kind === 'esteira'
        ? {
            id: workout?.id ?? uid(), date, kind, weightKg: weight, kcal: tm.kcal, km: tm.km, minutes: tm.minutes,
            segments: rows.filter((r) => r.speed > 0 && r.minutes > 0).map(({ speed, minutes }) => ({ speed, minutes })),
          }
        : { id: workout?.id ?? uid(), date, kind, weightKg: weight, kcal: simpleKcal, minutes };
    update((d) => ({ ...d, workouts: workout ? d.workouts.map((x) => (x.id === workout.id ? w : x)) : [...d.workouts, w] }));
    onClose();
  }

  function remove() {
    if (!workout || !confirm('Apagar este treino?')) return;
    update((d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== workout.id) }));
    onClose();
  }

  const setRow = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <Sheet title={workout ? 'Editar treino' : 'Novo treino'} onClose={onClose}>
      <div className="space-y-4">
        <Segmented
          options={(Object.keys(WORKOUT_LABEL) as WorkoutKind[]).map((v) => ({ value: v, label: WORKOUT_LABEL[v] }))}
          value={kind}
          onChange={setKind}
        />

        {kind !== 'esteira' ? (
          <div className="space-y-2">
            <Field label="Duração" hint={`${MET[kind]} MET × ${fmt1(weight)} kg × horas`}>
              <NumInput value={minutes} onChange={setMinutes} suffix="min" autoFocus />
            </Field>
            <div className="flex flex-wrap gap-2">
              {[30, 45, 60, 90].map((m) => (
                <button key={m} onClick={() => setMinutes(m)} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm active:bg-slate-200 dark:active:bg-slate-700">{m} min</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-800">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Presets (gera os segmentos)</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    variant="secondary"
                    className="text-sm"
                    onClick={() => {
                      setWalkMin(p.walk);
                      setRunMin(p.run);
                      generate(p.walk, p.run);
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Field label="Caminhada"><NumInput value={walkMin} onChange={setWalkMin} suffix="min" /></Field>
                <Field label="a"><NumInput value={walkSpeed} onChange={setWalkSpeed} suffix="km/h" /></Field>
                <Field label="Até"><NumInput value={targetKm} onChange={setTargetKm} suffix="km" /></Field>
                <Field label="Corrida"><NumInput value={runMin} onChange={setRunMin} suffix="min" /></Field>
                <Field label="a"><NumInput value={runSpeed} onChange={setRunSpeed} suffix="km/h" /></Field>
                <div className="flex items-end">
                  <Button variant="ghost" className="w-full text-sm" onClick={() => generate()}>Gerar</Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem_1.5rem] items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
                <span>#</span><span>Velocidade</span><span>Minutos</span><span className="text-right">MET</span><span />
              </div>
              {rows.map((r, i) => (
                <div key={r.key} className="grid grid-cols-[2rem_1fr_1fr_3.5rem_1.5rem] items-center gap-2">
                  <span className="text-sm text-slate-400 dark:text-slate-500">{i + 1}</span>
                  <NumInput value={r.speed} onChange={(n) => setRow(r.key, { speed: n })} suffix="km/h" />
                  <NumInput value={r.minutes} onChange={(n) => setRow(r.key, { minutes: n })} suffix="min" />
                  <span className="text-right text-sm text-slate-600 dark:text-slate-300">{r.speed > 0 ? fmt1(treadmillMet(r.speed)) : '—'}</span>
                  <button className="text-xl text-slate-400 dark:text-slate-500" aria-label="Remover" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>×</button>
                </div>
              ))}
              <Button variant="secondary" className="w-full" onClick={() => setRows((rs) => [...rs, { key: uid(), speed: rs.at(-1)?.speed ?? NaN, minutes: NaN }])}>
                + Segmento
              </Button>
            </div>
          </>
        )}

        <div className="sticky bottom-0 -mx-4 -mb-4 space-y-3 bg-slate-50/95 dark:bg-slate-950/95 p-4 backdrop-blur">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-center text-white">
          <div><div className="text-xs text-slate-300">Gasto</div><div className="font-semibold">{fmt0(kcal)} kcal</div></div>
          <div><div className="text-xs text-slate-300">Tempo</div><div className="font-semibold">{fmt0(kind === 'esteira' ? tm.minutes : minutes || 0)} min</div></div>
          <div><div className="text-xs text-slate-300">Distância</div><div className="font-semibold">{kind === 'esteira' ? `${fmt2(tm.km)} km` : '—'}</div></div>
        </div>

        <div className="flex gap-3">
          {workout && <Button variant="danger" onClick={remove}>Apagar</Button>}
          <Button className="flex-1" disabled={!valid} onClick={save}>Salvar treino</Button>
        </div>
        </div>
      </div>
    </Sheet>
  );
}
