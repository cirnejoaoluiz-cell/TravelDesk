import { ITINERARY_TYPES } from '../../../domain/catalog';
import type { ItineraryItem } from '../../../domain/types';

/** Regras de exibição do itinerário, compartilhadas entre a aba e a exportação em PDF. */

export function itineraryTitle(item: ItineraryItem) {
  if (item.title) return item.title;
  if (item.origin || item.destination) return [item.origin, item.destination].filter(Boolean).join(' → ');
  return ITINERARY_TYPES[item.type].label;
}

const sortKey = (i: ItineraryItem) => `${i.startDate || '9999'}T${i.startTime || '99:99'}`;

/** Ordem cronológica, agrupada pela data de início ('' = sem data, por último). */
export function groupItineraryByDate(items: ItineraryItem[]): [string, ItineraryItem[]][] {
  const sorted = [...items].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const map = new Map<string, ItineraryItem[]>();
  for (const item of sorted) {
    const key = item.startDate || '';
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()];
}
