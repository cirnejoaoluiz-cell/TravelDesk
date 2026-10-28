import { ITINERARY_TYPES } from './catalog';
import { findTripCity } from './destinations';
import type { Activity, ISODate, ItineraryItem, TimeHM, Trip } from './types';
import { parseISODate, toISODate } from '../lib/dates';

/**
 * Plano de cada dia (cidade e horários), calculado a partir do Itinerário.
 *
 * Nada aqui é salvo: a cidade e os horários de chegada/partida são derivados dos
 * registros do Itinerário toda vez que o Roteiro é exibido. Assim, qualquer
 * alteração no Itinerário aparece no Roteiro na hora, sem cópias para sincronizar.
 * A única informação guardada é a escolha manual da cidade de um dia
 * (`trip.dayCities`), mantida separada do que é calculado.
 */

/** Um deslocamento do Itinerário com datas e horários de partida e chegada. */
export interface Movement {
  itemId: string;
  /** "Voo", "Trem"… */
  mode: string;
  from: string;
  to: string;
  departDate: ISODate;
  departTime: TimeHM;
  arriveDate: ISODate;
  /** '' quando o horário de chegada não foi cadastrado (nunca é estimado). */
  arriveTime: TimeHM;
}

export type CitySource = 'arrival' | 'stay' | 'before-departure' | 'lodging';

export interface DayPlan {
  date: ISODate;
  /** Cidade calculada pelo Itinerário (null = não identificada). */
  derivedCity: string | null;
  derivedSource: CitySource | null;
  /** Cidade escolhida manualmente no Roteiro para este dia (null = nenhuma). */
  manualCity: string | null;
  /** Cidade em uso: a manual, se houver; senão a calculada. */
  city: string | null;
  /** Onde a pessoa começa o dia (antes das chegadas do dia). */
  startCity: string | null;
  /** Chegadas neste dia, em ordem de horário (inclui as que partiram no dia anterior). */
  arrivals: Movement[];
  /** Partidas neste dia (inclui as que só chegam em outro dia). */
  departures: Movement[];
  /** A escolha manual difere do que o Itinerário indica agora. */
  conflict: boolean;
}

const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
export const sameCity = (a: string | null | undefined, b: string | null | undefined) => Boolean(a && b && key(a) === key(b));

function nextDay(date: ISODate): ISODate {
  const d = parseISODate(date)!;
  d.setDate(d.getDate() + 1);
  return toISODate(d);
}

/**
 * Data de chegada de um deslocamento:
 * - a data de chegada cadastrada, quando existe;
 * - sem data de chegada, mas com horário de chegada anterior ao de partida
 *   (ex.: parte 18:00, chega 06:00), a chegada é no dia seguinte;
 * - caso contrário, o mesmo dia da partida.
 */
export function arrivalDate(item: Pick<ItineraryItem, 'startDate' | 'startTime' | 'endDate' | 'endTime'>): ISODate {
  if (item.endDate) return item.endDate;
  if (item.startTime && item.endTime && item.endTime < item.startTime) return nextDay(item.startDate);
  return item.startDate;
}

/** Deslocamentos do Itinerário com cidade de destino e data de partida. */
export function movementsFrom(itinerary: ItineraryItem[]): Movement[] {
  return itinerary
    .filter((i) => ITINERARY_TYPES[i.type].isTransport && i.destination.trim() && i.startDate)
    .map((i) => ({
      itemId: i.id,
      mode: ITINERARY_TYPES[i.type].label,
      from: i.origin.trim(),
      to: i.destination.trim(),
      departDate: i.startDate,
      departTime: i.startTime,
      arriveDate: arrivalDate(i),
      arriveTime: i.endTime,
    }))
    .sort((a, b) => `${a.arriveDate}T${a.arriveTime || '99:99'}`.localeCompare(`${b.arriveDate}T${b.arriveTime || '99:99'}`));
}

/** Momento em que a pessoa passa a estar numa cidade: chegada de transporte ou check-in de hospedagem. */
interface Presence {
  date: ISODate;
  sortTime: string;
  city: string;
  source: 'arrival' | 'lodging';
}

function presences(itinerary: ItineraryItem[], movements: Movement[]): Presence[] {
  const list: Presence[] = movements.map((m) => ({ date: m.arriveDate, sortTime: m.arriveTime || '99:98', city: m.to, source: 'arrival' }));
  for (const i of itinerary) {
    if (i.type === 'lodging' && i.destination.trim() && i.startDate) {
      list.push({ date: i.startDate, sortTime: i.startTime || '99:99', city: i.destination.trim(), source: 'lodging' });
    }
  }
  return list.sort((a, b) => `${a.date}T${a.sortTime}`.localeCompare(`${b.date}T${b.sortTime}`));
}

/** Usa a grafia cadastrada na viagem quando a cidade faz parte dela. */
const canonical = (cities: string[], name: string) => findTripCity(cities, name) ?? name;

export function planDays(
  trip: Pick<Trip, 'itinerary' | 'destinations'> & { dayCities?: Record<string, string> },
  dates: ISODate[],
): Map<ISODate, DayPlan> {
  const cities = trip.destinations;
  const movements = movementsFrom(trip.itinerary);
  const stays = presences(trip.itinerary, movements);
  const departuresByDate = [...movements].sort((a, b) =>
    `${a.departDate}T${a.departTime || '99:99'}`.localeCompare(`${b.departDate}T${b.departTime || '99:99'}`),
  );
  const plans = new Map<ISODate, DayPlan>();

  for (const date of dates) {
    if (!date) continue;
    const arrivals = movements.filter((m) => m.arriveDate === date);
    const departures = departuresByDate.filter((m) => m.departDate === date);
    const before = stays.filter((p) => p.date < date);
    const today = stays.filter((p) => p.date === date);
    const lastBefore = before[before.length - 1];

    let startCity: string | null = lastBefore?.city ?? null;
    if (!startCity) {
      // Viagem noturna que chega hoje: o dia começa a caminho, vindo da origem dela.
      const overnight = arrivals.find((m) => m.departDate < date && m.from);
      // Antes do primeiro deslocamento, a pessoa está na origem dele.
      const next = departuresByDate.find((m) => m.departDate >= date && m.from);
      startCity = overnight?.from ?? next?.from ?? null;
    }

    let derivedCity: string | null = null;
    let derivedSource: CitySource | null = null;
    if (today.length) {
      const last = today[today.length - 1];
      derivedCity = last.city;
      derivedSource = last.source === 'arrival' ? 'arrival' : 'lodging';
    } else if (lastBefore) {
      derivedCity = lastBefore.city;
      derivedSource = 'stay';
    } else if (startCity) {
      derivedCity = startCity;
      derivedSource = 'before-departure';
    }

    const manual = trip.dayCities?.[date]?.trim() || null;
    plans.set(date, {
      date,
      derivedCity: derivedCity && canonical(cities, derivedCity),
      derivedSource,
      manualCity: manual,
      city: manual ?? (derivedCity && canonical(cities, derivedCity)),
      startCity: startCity && canonical(cities, startCity),
      arrivals,
      departures,
      conflict: Boolean(manual && derivedCity && !sameCity(manual, derivedCity)),
    });
  }
  return plans;
}

/**
 * Avisos de possível incompatibilidade de uma atividade com o plano do dia.
 * São só sinalizações: nada é bloqueado nem alterado.
 */
export function activityWarnings(activity: Pick<Activity, 'time' | 'city'>, plan: DayPlan | undefined): string[] {
  if (!plan) return [];
  const warnings: string[] = [];
  const city = activity.city || plan.city;

  if (activity.time) {
    for (const a of plan.arrivals) {
      if (a.arriveTime && sameCity(city, a.to) && activity.time < a.arriveTime) {
        warnings.push(`Antes da chegada a ${a.to} (${a.arriveTime})`);
      }
    }
    for (const d of plan.departures) {
      if (d.departTime && d.from && sameCity(city, d.from) && activity.time > d.departTime) {
        warnings.push(`Depois da saída de ${d.from} (${d.departTime})`);
      }
    }
  }

  // Cidade da atividade diferente de todas as cidades em que a pessoa estará no dia.
  if (activity.city && (plan.city || plan.startCity)) {
    const expected = [plan.city, plan.startCity, ...plan.arrivals.map((a) => a.to), ...plan.departures.map((d) => d.from)];
    if (!expected.some((c) => sameCity(c, activity.city))) {
      warnings.push(`Fora da cidade prevista para o dia (${plan.city ?? plan.startCity})`);
    }
  }
  return warnings;
}
