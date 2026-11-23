import { addDays, daysBetween } from './dates';
import type { AppData, Food, Profile, Segment, Sex, WeighIn } from './types';

export const KCAL_PER_KG = 7700;
export const ACTIVITY_FACTOR = 1.3;
export const PROTEIN_G_PER_KG = 2;

export const MET = {
  musculacao: 4.5,
  futebol: 7,
} as const;

/** Tabela velocidade (km/h) → MET da esteira. */
export const TREADMILL_MET: [number, number][] = [
  [6.0, 4.8],
  [6.5, 5.0],
  [7.0, 6.0],
  [8.0, 8.3],
  [10.0, 9.8],
];

// ---------- Gasto energético ----------

/** Taxa metabólica basal — Mifflin-St Jeor. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'M' ? 5 : -161);
}

/** Gasto base do dia (TMB × 1,3), sem exercício. */
export function baseExpenditure(p: Profile, weightKg: number): number {
  return bmr(p.sex, weightKg, p.heightCm, p.age) * ACTIVITY_FACTOR;
}

/** kcal = MET × peso (kg) × horas. */
export function metKcal(met: number, weightKg: number, minutes: number): number {
  return met * weightKg * (minutes / 60);
}

/** MET da esteira para a velocidade, interpolando linearmente (e extrapolando nas pontas). */
export function treadmillMet(speed: number): number {
  const t = TREADMILL_MET;
  let i = t.findIndex(([v]) => speed <= v);
  if (i === 0) i = 1; // abaixo do primeiro ponto: usa o primeiro trecho
  if (i === -1) i = t.length - 1; // acima do último: usa o último trecho
  const [v0, m0] = t[i - 1];
  const [v1, m1] = t[i];
  const met = m0 + ((speed - v0) * (m1 - m0)) / (v1 - v0);
  return Math.max(2, met);
}

export function treadmillSummary(segments: Segment[], weightKg: number) {
  let km = 0;
  let kcal = 0;
  let minutes = 0;
  for (const s of segments) {
    if (!(s.speed > 0) || !(s.minutes > 0)) continue;
    km += (s.speed * s.minutes) / 60;
    kcal += metKcal(treadmillMet(s.speed), weightKg, s.minutes);
    minutes += s.minutes;
  }
  return { km, kcal, minutes };
}

/**
 * Intervalado: alterna `walkMin` minutos a `walkSpeed` e `runMin` minutos a `runSpeed`
 * até completar `targetKm`. O último segmento é encurtado para fechar a distância exata.
 */
export function intervalSegments(
  walkMin: number,
  runMin: number,
  walkSpeed: number,
  runSpeed: number,
  targetKm: number,
): Segment[] {
  const segs: Segment[] = [];
  if (!(walkMin > 0 && runMin > 0 && walkSpeed > 0 && runSpeed > 0 && targetKm > 0)) return segs;
  let km = 0;
  let run = false;
  while (km < targetKm - 1e-9 && segs.length < 500) {
    const speed = run ? runSpeed : walkSpeed;
    let minutes = run ? runMin : walkMin;
    const segKm = (speed * minutes) / 60;
    if (km + segKm > targetKm) minutes = ((targetKm - km) * 60) / speed;
    minutes = Math.round(minutes * 10) / 10;
    if (minutes > 0) segs.push({ speed, minutes });
    km += (speed * minutes) / 60;
    run = !run;
  }
  return segs;
}

// ---------- Plano ----------

export function planTargets(p: Profile) {
  const totalKcal = p.goalLossKg * KCAL_PER_KG;
  const weekly = totalKcal / p.weeks;
  const daily = weekly / 7;
  const kgPerWeek = p.goalLossKg / p.weeks;
  const pctPerWeek = (kgPerWeek / p.startWeightKg) * 100;
  return { totalKcal, weekly, daily, kgPerWeek, pctPerWeek, tooFast: pctPerWeek > 1 };
}

export function planEndDate(p: Profile): string {
  return addDays(p.startDate, p.weeks * 7);
}

// ---------- Alimentos ----------

export function foodValues(food: Pick<Food, 'kcal100' | 'prot100'>, grams: number) {
  return { kcal: (food.kcal100 * grams) / 100, prot: (food.prot100 * grams) / 100 };
}

// ---------- Peso ----------

export function sortedWeighIns(w: WeighIn[]): WeighIn[] {
  return [...w].sort((a, b) => a.date.localeCompare(b.date));
}

/** Última pesagem até a data (inclusive); sem pesagem, o peso inicial do plano. */
export function weightOn(data: Pick<AppData, 'weighIns' | 'profile'>, date: string): number {
  let best: WeighIn | undefined;
  for (const w of data.weighIns) {
    if (w.date <= date && (!best || w.date > best.date)) best = w;
  }
  return best?.kg ?? data.profile?.startWeightKg ?? 70;
}

/** Média móvel de 7 dias (pesagens nos 7 dias corridos até cada data). */
export function movingAverage7(w: WeighIn[]): { date: string; kg: number }[] {
  const s = sortedWeighIns(w);
  return s.map((cur) => {
    const from = addDays(cur.date, -6);
    const win = s.filter((x) => x.date >= from && x.date <= cur.date);
    return { date: cur.date, kg: win.reduce((a, x) => a + x.kg, 0) / win.length };
  });
}

/** Peso previsto pela meta (linha reta do início ao fim do plano). */
export function projectedWeight(p: Profile, date: string): number {
  const total = p.weeks * 7;
  const d = Math.min(Math.max(daysBetween(p.startDate, date), 0), total);
  return p.startWeightKg - (p.goalLossKg * d) / total;
}

// ---------- Balanço ----------

export type DayStatus = 'registrado' | 'livre-estimado' | 'livre-branco' | 'sem-registro';

export interface DayBalance {
  date: string;
  status: DayStatus;
  /** Se o dia entra no acumulado. */
  counts: boolean;
  consumed: number;
  base: number;
  exercise: number;
  /** Positivo = déficit (gastou mais do que comeu). */
  deficit: number;
  protein: number;
  proteinGoal: number;
  weightKg: number;
}

export function dayBalance(data: AppData, date: string): DayBalance {
  const p = data.profile!;
  const weightKg = weightOn(data, date);
  const base = baseExpenditure(p, weightKg);
  const meals = data.meals.filter((m) => m.date === date);
  const items = meals.flatMap((m) => m.items);
  const logged = items.reduce((a, i) => a + i.kcal, 0);
  const protein = items.reduce((a, i) => a + i.prot, 0);
  const exercise = data.workouts.filter((w) => w.date === date).reduce((a, w) => a + w.kcal, 0);
  const free = data.freeDays[date];

  let status: DayStatus;
  let consumed: number;
  if (free) {
    if (free.estimateKcal != null) {
      status = 'livre-estimado';
      consumed = free.estimateKcal;
    } else {
      // Em branco: considera que comeu o que gastou (déficit zero).
      status = 'livre-branco';
      consumed = base + exercise;
    }
  } else if (meals.length > 0) {
    status = 'registrado';
    consumed = logged;
  } else {
    status = 'sem-registro';
    consumed = 0;
  }

  const counts = status !== 'sem-registro';
  return {
    date,
    status,
    counts,
    consumed,
    base,
    exercise,
    deficit: counts ? base + exercise - consumed : 0,
    protein,
    proteinGoal: weightKg * PROTEIN_G_PER_KG,
    weightKg,
  };
}

/** Índice (0 = primeira) da semana do plano que contém a data. */
export function planWeekIndex(p: Profile, date: string): number {
  return Math.floor(daysBetween(p.startDate, date) / 7);
}

export interface WeekSummary {
  index: number;
  start: string;
  end: string;
  days: DayBalance[];
  target: number;
  accumulated: number;
  /** Acumulado só dos dias já encerrados (antes de hoje). */
  closedAccumulated: number;
  /** Dias restantes, incluindo hoje. */
  daysLeft: number;
  remaining: number;
  perDayNeeded: number;
}

export function weekSummary(data: AppData, index: number, todayISO: string): WeekSummary {
  const p = data.profile!;
  const start = addDays(p.startDate, index * 7);
  const end = addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, i) => dayBalance(data, addDays(start, i)));
  const target = planTargets(p).weekly;
  const accumulated = days.reduce((a, d) => a + d.deficit, 0);
  const closedAccumulated = days.filter((d) => d.date < todayISO).reduce((a, d) => a + d.deficit, 0);
  const daysLeft = days.filter((d) => d.date >= todayISO).length;
  const remaining = target - closedAccumulated;
  return {
    index,
    start,
    end,
    days,
    target,
    accumulated,
    closedAccumulated,
    daysLeft,
    remaining,
    perDayNeeded: daysLeft > 0 ? Math.max(0, remaining) / daysLeft : 0,
  };
}

/** Déficit acumulado do início do plano até a data (inclusive). */
export function cumulativeDeficit(data: AppData, until: string): number {
  const p = data.profile!;
  let total = 0;
  for (let d = p.startDate; d <= until; d = addDays(d, 1)) total += dayBalance(data, d).deficit;
  return total;
}
