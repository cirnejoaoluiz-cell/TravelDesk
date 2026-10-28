import type { Activity } from '../../../domain/types';

/** Regras de ordenação do roteiro, separadas da interface para serem testáveis. */

export function sortedDay(activities: Activity[], date: string): Activity[] {
  return activities.filter((a) => a.date === date).sort((a, b) => a.order - b.order);
}

export function nextOrder(activities: Activity[], date: string): number {
  const day = activities.filter((a) => a.date === date);
  return day.length ? Math.max(...day.map((a) => a.order)) + 1 : 0;
}

/** Salva uma atividade; se ela mudou de dia (ou é nova), vai para o fim do novo dia. */
export function saveActivity(activities: Activity[], activity: Activity): Activity[] {
  const existing = activities.find((a) => a.id === activity.id);
  if (existing && existing.date === activity.date) {
    return activities.map((a) => (a.id === activity.id ? activity : a));
  }
  const others = activities.filter((a) => a.id !== activity.id);
  return [...others, { ...activity, order: nextOrder(others, activity.date) }];
}

/**
 * Move uma atividade uma posição para cima/baixo dentro do dia.
 * `visibleIds` permite mover considerando apenas os itens exibidos (ex.: filtro por cidade).
 */
export function moveActivity(activities: Activity[], id: string, direction: -1 | 1, visibleIds?: Set<string>): Activity[] {
  const target = activities.find((a) => a.id === id);
  if (!target) return activities;
  const day = sortedDay(activities, target.date);
  const visible = visibleIds ? day.filter((a) => visibleIds.has(a.id)) : day;
  const vIndex = visible.findIndex((a) => a.id === id);
  const neighbor = visible[vIndex + direction];
  if (!neighbor) return activities;

  const reordered = day.slice();
  const i = reordered.findIndex((a) => a.id === id);
  const j = reordered.findIndex((a) => a.id === neighbor.id);
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  const orders = new Map(reordered.map((a, index) => [a.id, index]));
  return activities.map((a) => (orders.has(a.id) ? { ...a, order: orders.get(a.id)! } : a));
}

/** Reordena um dia pelo horário (itens sem horário vão para o fim, mantendo a ordem atual). */
export function sortDayByTime(activities: Activity[], date: string): Activity[] {
  const day = sortedDay(activities, date);
  const sorted = [...day].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  const orders = new Map(sorted.map((a, index) => [a.id, index]));
  return activities.map((a) => (orders.has(a.id) ? { ...a, order: orders.get(a.id)! } : a));
}

export interface ScheduleDay {
  /** '' = atividades sem dia definido (sempre por último). */
  date: string;
  items: Activity[];
}

/**
 * Agrupa por dia, preservando a ordem definida pelo usuário dentro de cada dia.
 * `tripDays` entram mesmo sem atividades quando `includeEmptyTripDays` é verdadeiro.
 */
export function groupActivitiesByDay(activities: Activity[], tripDays: string[], includeEmptyTripDays: boolean): ScheduleDay[] {
  const keys = new Set<string>(includeEmptyTripDays ? tripDays : []);
  activities.forEach((a) => a.date && keys.add(a.date));
  const list = [...keys].sort().map((date) => ({
    date,
    items: activities.filter((a) => a.date === date).sort((a, b) => a.order - b.order),
  }));
  const undated = activities.filter((a) => !a.date).sort((a, b) => a.order - b.order);
  if (undated.length) list.push({ date: '', items: undated });
  return list;
}
