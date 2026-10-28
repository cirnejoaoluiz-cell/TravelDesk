import type { CurrencyCode, Expense, ExpenseCategory, Trip } from './types';

/** Quanto de uma despesa já foi pago, na moeda da própria despesa. */
export function paidPortion(expense: Expense): number {
  switch (expense.status) {
    case 'paid':
      return expense.amount;
    case 'pending':
      return 0;
    case 'installments': {
      const total = Math.max(1, expense.installments || 1);
      const paid = Math.min(Math.max(0, expense.paidInstallments || 0), total);
      return (expense.amount * paid) / total;
    }
  }
}

export function installmentValue(expense: Expense): number {
  return expense.amount / Math.max(1, expense.installments || 1);
}

/** Fator de conversão para a moeda principal, ou null quando não há cotação. */
export function conversionRate(expense: Expense, tripCurrency: CurrencyCode): number | null {
  if (expense.currency === tripCurrency) return 1;
  return expense.exchangeRate && expense.exchangeRate > 0 ? expense.exchangeRate : null;
}

export interface FinanceSummary {
  currency: CurrencyCode;
  total: number;
  paid: number;
  pending: number;
  budget: number | null;
  /** Orçamento − total (negativo = acima do orçamento). */
  budgetRemaining: number | null;
  /** Percentual do orçamento comprometido (0–∞). */
  budgetUsage: number | null;
  byCategory: { category: ExpenseCategory; total: number }[];
  /** Despesas em outra moeda sem cotação: ficam fora dos totais, somadas por moeda. */
  unconverted: { currency: CurrencyCode; total: number; count: number }[];
}

const round = (n: number) => Math.round(n * 100) / 100;

export function summarizeFinances(trip: Pick<Trip, 'expenses' | 'budget' | 'currency'>): FinanceSummary {
  let total = 0;
  let paid = 0;
  const categories = new Map<ExpenseCategory, number>();
  const unconverted = new Map<CurrencyCode, { total: number; count: number }>();

  for (const expense of trip.expenses) {
    const rate = conversionRate(expense, trip.currency);
    if (rate === null) {
      const entry = unconverted.get(expense.currency) ?? { total: 0, count: 0 };
      entry.total += expense.amount;
      entry.count += 1;
      unconverted.set(expense.currency, entry);
      continue;
    }
    const amount = expense.amount * rate;
    total += amount;
    paid += paidPortion(expense) * rate;
    categories.set(expense.category, (categories.get(expense.category) ?? 0) + amount);
  }

  const budget = trip.budget && trip.budget > 0 ? trip.budget : null;

  return {
    currency: trip.currency,
    total: round(total),
    paid: round(paid),
    pending: round(total - paid),
    budget,
    budgetRemaining: budget === null ? null : round(budget - total),
    budgetUsage: budget === null ? null : total / budget,
    byCategory: [...categories.entries()]
      .map(([category, value]) => ({ category, total: round(value) }))
      .sort((a, b) => b.total - a.total),
    unconverted: [...unconverted.entries()].map(([currency, v]) => ({
      currency,
      total: round(v.total),
      count: v.count,
    })),
  };
}

/** Ordem de exibição das despesas: mais recentes primeiro (sem data por último). */
export function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
