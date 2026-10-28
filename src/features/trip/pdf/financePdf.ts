import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from '../../../domain/catalog';
import { conversionRate, installmentValue, paidPortion, sortExpenses, summarizeFinances } from '../../../domain/finance';
import type { Expense, Trip } from '../../../domain/types';
import { formatDate } from '../../../lib/dates';
import { formatMoney } from '../../../lib/money';
import { parts, Report, type RichCell, type TableColumn } from './report';

const SUMMARY_COLUMNS: TableColumn[] = [
  { header: 'ITEM', width: 104 },
  { header: 'VALOR', width: 70, align: 'right' },
];

const EXPENSE_COLUMNS: TableColumn[] = [
  { header: 'DATA', width: 25 },
  { header: 'DESCRIÇÃO', width: 53 },
  { header: 'STATUS', width: 34 },
  { header: 'VALOR', width: 32, align: 'right' },
  { header: 'PAGO', width: 30, align: 'right' },
];

function statusCell(e: Expense): RichCell {
  if (e.status !== 'installments') return { rich: [{ text: EXPENSE_STATUSES[e.status], bold: true, tone: e.status === 'paid' ? 'accent' : 'ink' }] };
  return {
    rich: [
      { text: `${EXPENSE_STATUSES.installments} ${e.paidInstallments}/${e.installments}`, bold: true },
      { text: `${e.installments}× de ${formatMoney(installmentValue(e), e.currency)}`, tone: 'muted' },
    ],
  };
}

export function buildFinancePdf(trip: Trip): Blob {
  const report = new Report(trip, 'Financeiro');
  // Mesmas regras de cálculo da aba: compras parceladas entram uma vez, pelo valor total.
  const s = summarizeFinances(trip);
  const money = (v: number) => formatMoney(v, trip.currency);

  report.label('Resumo');
  const remaining =
    s.budget === null
      ? 'Sem orçamento definido'
      : s.budgetRemaining! >= 0
        ? money(s.budgetRemaining!)
        : `${money(-s.budgetRemaining!)} acima`;
  report.table(
    SUMMARY_COLUMNS,
    [
      ['Orçamento estimado', { rich: [{ text: s.budget === null ? 'Não definido' : money(s.budget), bold: true }] }],
      ['Custo total registrado', { rich: [{ text: money(s.total), bold: true }] }],
      ['Valor já pago', { rich: [{ text: money(s.paid), bold: true, tone: 'accent' }] }],
      ['Saldo pendente', { rich: [{ text: money(s.pending), bold: true }] }],
      [
        'Orçamento restante',
        {
          rich: parts(
            { text: remaining, bold: true, tone: s.budgetRemaining !== null && s.budgetRemaining < 0 ? 'danger' : 'ink' },
            s.budgetUsage !== null && { text: `${Math.round(s.budgetUsage * 100)}% do orçamento comprometido`, tone: 'muted' },
          ),
        },
      ],
    ],
    { head: false },
  );
  report.note(`Valores consolidados em ${trip.currency}. Despesas parceladas entram pelo valor total; o valor pago considera as parcelas já quitadas.`, 'faint');

  if (s.unconverted.length) {
    report.note(
      `Fora dos totais por falta de cotação: ${s.unconverted
        .map((u) => `${formatMoney(u.total, u.currency)} (${u.count} ${u.count === 1 ? 'despesa' : 'despesas'})`)
        .join(', ')}.`,
      'danger',
    );
  }

  report.label('Despesas');
  if (!trip.expenses.length) {
    report.empty('Ainda não existem despesas cadastradas.');
    return report.toBlob();
  }

  report.table(
    EXPENSE_COLUMNS,
    sortExpenses(trip.expenses).map((e) => {
      const rate = conversionRate(e, trip.currency);
      const foreign = e.currency !== trip.currency;
      return [
        e.date ? formatDate(e.date) : '—',
        {
          rich: parts(
            { text: e.description, bold: true },
            { text: [EXPENSE_CATEGORIES[e.category], e.city].filter(Boolean).join(' · '), tone: 'muted' },
            e.notes && { text: e.notes, tone: 'faint' },
          ),
        },
        statusCell(e),
        {
          rich: parts(
            { text: formatMoney(e.amount, e.currency), bold: true },
            foreign && { text: rate ? `≈ ${money(e.amount * rate)}` : 'sem cotação', tone: 'muted' },
          ),
        },
        {
          rich: parts(
            { text: formatMoney(paidPortion(e), e.currency) },
            foreign && rate !== null && { text: `≈ ${money(paidPortion(e) * rate)}`, tone: 'muted' },
          ),
        },
      ];
    }),
  );
  return report.toBlob();
}
