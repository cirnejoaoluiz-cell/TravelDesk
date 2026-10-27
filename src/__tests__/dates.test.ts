import { describe, expect, it } from 'vitest';
import { eachDay, formatDateRange, relativeTripLabel, tripPhase } from '../lib/dates';
import { parseMoneyInput } from '../lib/money';

describe('datas e valores', () => {
  it('lista os dias da viagem', () => {
    expect(eachDay('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('formata intervalos', () => {
    expect(formatDateRange('2026-10-12', '2026-10-20')).toMatch(/^12 – 20 out 2026$/);
    expect(formatDateRange('', '')).toBe('Datas a definir');
  });

  it('classifica a fase da viagem', () => {
    expect(tripPhase('2026-11-01', '2026-11-10', '2026-10-27')).toBe('upcoming');
    expect(tripPhase('2026-10-20', '2026-10-30', '2026-10-27')).toBe('ongoing');
    expect(tripPhase('2026-01-01', '2026-01-10', '2026-10-27')).toBe('past');
    expect(relativeTripLabel('2026-10-28', '2026-11-02', '2026-10-27')).toBe('Amanhã');
  });

  it('interpreta valores no formato brasileiro', () => {
    expect(parseMoneyInput('1.234,56')).toBe(1234.56);
    expect(parseMoneyInput('1234.5')).toBe(1234.5);
    expect(parseMoneyInput('1.500')).toBe(1500);
    expect(parseMoneyInput('2.5')).toBe(2.5);
    expect(parseMoneyInput('R$ 80')).toBe(80);
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('')).toBeNull();
  });
});
