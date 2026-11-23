import { describe, expect, it } from 'vitest';
import {
  bmr, dayBalance, intervalSegments, movingAverage7, planTargets, treadmillMet, treadmillSummary, weekSummary,
} from '../lib/calc';
import { DEFAULT_FOODS } from '../lib/foods';
import type { AppData, Profile } from '../lib/types';

const profile: Profile = { sex: 'M', age: 30, heightCm: 180, startWeightKg: 90, goalLossKg: 6, weeks: 12, startDate: '2026-01-05' };
const empty = (): AppData => ({ version: 1, profile, foods: DEFAULT_FOODS, meals: [], favorites: [], workouts: [], weighIns: [], freeDays: {} });

describe('cálculos', () => {
  it('Mifflin-St Jeor', () => {
    expect(bmr('M', 90, 180, 30)).toBe(900 + 1125 - 150 + 5);
    expect(bmr('F', 60, 165, 30)).toBeCloseTo(600 + 1031.25 - 150 - 161);
  });

  it('metas do plano', () => {
    const t = planTargets(profile);
    expect(t.totalKcal).toBe(46200);
    expect(t.weekly).toBe(3850);
    expect(t.daily).toBe(550);
    expect(t.tooFast).toBe(false);
    expect(planTargets({ ...profile, goalLossKg: 12, weeks: 8 }).tooFast).toBe(true);
  });

  it('MET da esteira interpola', () => {
    expect(treadmillMet(6.5)).toBe(5.0);
    expect(treadmillMet(7.5)).toBeCloseTo(7.15);
    expect(treadmillMet(9)).toBeCloseTo(9.05);
    expect(treadmillMet(10)).toBe(9.8);
  });

  it('intervalado 7/3 até 10 km', () => {
    const segs = intervalSegments(7, 3, 6.5, 10, 10);
    const s = treadmillSummary(segs, 90);
    expect(s.km).toBeCloseTo(10, 1);
    expect(segs[0]).toEqual({ speed: 6.5, minutes: 7 });
    expect(segs[1]).toEqual({ speed: 10, minutes: 3 });
  });

  it('dia sem registro não conta; dia livre em branco = déficit 0', () => {
    const d = empty();
    expect(dayBalance(d, '2026-01-05').counts).toBe(false);
    d.freeDays['2026-01-05'] = {};
    const b = dayBalance(d, '2026-01-05');
    expect(b.counts).toBe(true);
    expect(b.deficit).toBeCloseTo(0);
  });

  it('balanço do dia e semana', () => {
    const d = empty();
    d.meals.push({ id: 'm', date: '2026-01-05', type: 'almoco', items: [{ id: 'i', foodId: 'arroz', name: 'Arroz', grams: 100, kcal: 1500, prot: 100 }] });
    const b = dayBalance(d, '2026-01-05');
    expect(b.deficit).toBeCloseTo(1880 * 1.3 - 1500);
    const w = weekSummary(d, 0, '2026-01-06');
    expect(w.closedAccumulated).toBeCloseTo(b.deficit);
    expect(w.daysLeft).toBe(6);
  });

  it('média móvel de 7 dias', () => {
    const ma = movingAverage7([
      { id: 'a', date: '2026-01-01', kg: 90 },
      { id: 'b', date: '2026-01-05', kg: 88 },
      { id: 'c', date: '2026-01-09', kg: 86 },
    ]);
    expect(ma[1].kg).toBe(89);
    expect(ma[2].kg).toBe(87);
  });
});
