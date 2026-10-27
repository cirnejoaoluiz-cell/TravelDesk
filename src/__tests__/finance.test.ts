import { describe, expect, it } from 'vitest';
import { emptyExpense } from '../domain/factories';
import { paidPortion, summarizeFinances } from '../domain/finance';
import type { Expense } from '../domain/types';

const expense = (patch: Partial<Expense>): Expense => ({ ...emptyExpense('BRL'), ...patch });

describe('finanças', () => {
  it('calcula a parte paga por status', () => {
    expect(paidPortion(expense({ amount: 100, status: 'paid' }))).toBe(100);
    expect(paidPortion(expense({ amount: 100, status: 'pending' }))).toBe(0);
    expect(paidPortion(expense({ amount: 1200, status: 'installments', installments: 4, paidInstallments: 1 }))).toBe(300);
  });

  it('resume total, pago, pendente e orçamento', () => {
    const s = summarizeFinances({
      currency: 'BRL',
      budget: 10000,
      expenses: [
        expense({ amount: 4000, status: 'paid', category: 'flights' }),
        expense({ amount: 3000, status: 'installments', installments: 3, paidInstallments: 2, category: 'lodging' }),
        expense({ amount: 500, status: 'pending', category: 'tours' }),
      ],
    });
    expect(s.total).toBe(7500);
    expect(s.paid).toBe(6000);
    expect(s.pending).toBe(1500);
    expect(s.budgetRemaining).toBe(2500);
    expect(s.budgetUsage).toBeCloseTo(0.75);
    expect(s.byCategory[0]).toEqual({ category: 'flights', total: 4000 });
  });

  it('converte moedas com cotação e separa as sem cotação', () => {
    const s = summarizeFinances({
      currency: 'BRL',
      budget: null,
      expenses: [
        expense({ amount: 100, currency: 'EUR', exchangeRate: 6, status: 'paid' }),
        expense({ amount: 50, currency: 'USD', exchangeRate: null, status: 'paid' }),
      ],
    });
    expect(s.total).toBe(600);
    expect(s.paid).toBe(600);
    expect(s.budgetUsage).toBeNull();
    expect(s.unconverted).toEqual([{ currency: 'USD', total: 50, count: 1 }]);
  });

  it('acusa orçamento estourado', () => {
    const s = summarizeFinances({ currency: 'BRL', budget: 1000, expenses: [expense({ amount: 1250, status: 'paid' })] });
    expect(s.budgetRemaining).toBe(-250);
    expect(s.budgetUsage).toBeCloseTo(1.25);
  });
});
