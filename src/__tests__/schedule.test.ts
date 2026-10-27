import { describe, expect, it } from 'vitest';
import { emptyActivity } from '../domain/factories';
import type { Activity } from '../domain/types';
import { moveActivity, saveActivity, sortDayByTime, sortedDay } from '../features/trip/schedule/scheduleOps';

const act = (id: string, date: string, order: number, patch: Partial<Activity> = {}): Activity => ({
  ...emptyActivity(),
  id,
  title: id,
  date,
  order,
  ...patch,
});

const titles = (list: Activity[], date: string) => sortedDay(list, date).map((a) => a.id);

describe('roteiro', () => {
  const day = '2026-11-10';
  const base = [act('a', day, 0), act('b', day, 1), act('c', day, 2), act('x', '2026-11-11', 0)];

  it('move atividades para cima e para baixo dentro do dia', () => {
    expect(titles(moveActivity(base, 'c', -1), day)).toEqual(['a', 'c', 'b']);
    expect(titles(moveActivity(base, 'a', 1), day)).toEqual(['b', 'a', 'c']);
    expect(titles(moveActivity(base, 'a', -1), day)).toEqual(['a', 'b', 'c']);
  });

  it('respeita o filtro de itens visíveis', () => {
    const moved = moveActivity(base, 'c', -1, new Set(['a', 'c']));
    expect(titles(moved, day)).toEqual(['c', 'b', 'a']);
  });

  it('coloca no fim do novo dia ao trocar de data', () => {
    const moved = saveActivity(base, { ...base[0], date: '2026-11-11' });
    expect(titles(moved, '2026-11-11')).toEqual(['x', 'a']);
    expect(titles(moved, day)).toEqual(['b', 'c']);
  });

  it('ordena um dia pelo horário', () => {
    const list = [act('a', day, 0, { time: '15:00' }), act('b', day, 1), act('c', day, 2, { time: '09:30' })];
    expect(titles(sortDayByTime(list, day), day)).toEqual(['c', 'a', 'b']);
  });
});
