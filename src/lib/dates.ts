import type { ISODate } from '../domain/types';

/** Converte `YYYY-MM-DD` em Date local (meia-noite), evitando o deslocamento de fuso do `new Date(iso)`. */
export function parseISODate(value: ISODate): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

const shortFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
const shortYearFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
const weekdayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

function clean(text: string) {
  // "12 de out. de 2026" -> "12 out 2026"
  return text.replace(/ de /g, ' ').replace(/\./g, '');
}

export function formatDate(value: ISODate, withYear = true): string {
  const date = parseISODate(value);
  if (!date) return '';
  return clean((withYear ? shortYearFmt : shortFmt).format(date));
}

export function formatWeekday(value: ISODate): string {
  const date = parseISODate(value);
  if (!date) return '';
  const text = weekdayFmt.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "12 – 20 out 2026", "28 set – 4 out 2026" ou "28 dez 2026 – 4 jan 2027". */
export function formatDateRange(start: ISODate, end: ISODate): string {
  const s = parseISODate(start);
  const e = parseISODate(end);
  if (!s && !e) return 'Datas a definir';
  if (!s) return `Até ${formatDate(end)}`;
  if (!e) return `A partir de ${formatDate(start)}`;
  if (s.getFullYear() !== e.getFullYear()) return `${formatDate(start)} – ${formatDate(end)}`;
  if (s.getMonth() === e.getMonth()) {
    if (s.getDate() === e.getDate()) return formatDate(start);
    return `${s.getDate()} – ${formatDate(end)}`;
  }
  return `${formatDate(start, false)} – ${formatDate(end)}`;
}

export function daysBetween(start: ISODate, end: ISODate): number | null {
  const s = parseISODate(start);
  const e = parseISODate(end);
  if (!s || !e) return null;
  return Math.round((e.getTime() - s.getTime()) / 86_400_000);
}

/** Lista de todos os dias entre duas datas (inclusive). Limitada para evitar intervalos absurdos. */
export function eachDay(start: ISODate, end: ISODate, limit = 120): ISODate[] {
  const s = parseISODate(start);
  const e = parseISODate(end);
  if (!s || !e || e < s) return [];
  const days: ISODate[] = [];
  const cursor = new Date(s);
  while (cursor <= e && days.length < limit) {
    days.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export type TripPhase = 'upcoming' | 'ongoing' | 'past' | 'undated';

export function tripPhase(start: ISODate, end: ISODate, today = todayISO()): TripPhase {
  if (!start && !end) return 'undated';
  const finish = end || start;
  const begin = start || end;
  if (finish < today) return 'past';
  if (begin <= today) return 'ongoing';
  return 'upcoming';
}

/** Texto curto de status: "Em 12 dias", "Amanhã", "Em andamento", "Concluída". */
export function relativeTripLabel(start: ISODate, end: ISODate, today = todayISO()): string {
  const phase = tripPhase(start, end, today);
  if (phase === 'undated') return 'Sem data';
  if (phase === 'past') return 'Concluída';
  if (phase === 'ongoing') return 'Em andamento';
  const days = daysBetween(today, start) ?? 0;
  if (days === 1) return 'Amanhã';
  return `Em ${days} dias`;
}
