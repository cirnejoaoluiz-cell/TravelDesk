import { describe, expect, it } from 'vitest';
import { DEFAULT_FOODS } from '../lib/foods';
import { normalize } from '../lib/store';

const v1 = (foods: unknown[]) => ({ version: 1, profile: null, foods, meals: [], favorites: [], workouts: [], weighIns: [], freeDays: {} });

describe('base de alimentos', () => {
  it('dados antigos recebem ovo, cuscuz e pão francês, mantendo os do usuário', () => {
    const mine = { id: 'x', name: 'Iogurte', kcal100: 60, prot100: 4 };
    const d = normalize(v1([DEFAULT_FOODS[0], mine]));
    expect(d.foods.map((f) => f.id)).toEqual(['frango', 'x', 'ovo', 'cuscuz', 'pao-frances']);
    expect(d.foodSeed).toBe(2);
  });

  it('não recoloca alimento apagado depois da atualização', () => {
    const d = normalize({ ...v1([DEFAULT_FOODS[0]]), foodSeed: 2 });
    expect(d.foods.map((f) => f.id)).toEqual(['frango']);
  });
});
