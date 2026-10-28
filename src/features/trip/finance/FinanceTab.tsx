import { useMemo, useState } from 'react';
import { CheckCircle2, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { Menu, type MenuAction } from '../../../components/Menu';
import { ProgressBar } from '../../../components/ProgressBar';
import { useConfirm } from '../../../components/Confirm';
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from '../../../domain/catalog';
import { conversionRate, paidPortion, sortExpenses, summarizeFinances } from '../../../domain/finance';
import type { Expense, ExpenseStatus } from '../../../domain/types';
import { removeById, upsertById } from '../../../lib/collections';
import { formatDate } from '../../../lib/dates';
import { formatMoney } from '../../../lib/money';
import { TabHeader } from '../shared';
import type { TabProps } from '../types';
import { ExpenseFormModal } from './ExpenseFormModal';
import { ExportPdfButton } from '../pdf/ExportPdfButton';

type StatusFilter = 'all' | ExpenseStatus;

export function FinanceTab({ trip, update }: TabProps) {
  const [form, setForm] = useState<{ open: boolean; initial: Expense | null }>({ open: false, initial: null });
  const [filter, setFilter] = useState<StatusFilter>('all');
  const confirm = useConfirm();
  const summary = useMemo(() => summarizeFinances(trip), [trip]);
  const money = (v: number) => formatMoney(v, trip.currency);

  const expenses = useMemo(
    () =>
      sortExpenses(trip.expenses.filter((e) => filter === 'all' || e.status === filter)),
    [trip.expenses, filter],
  );

  const setExpenses = (fn: (list: Expense[]) => Expense[]) => update((t) => ({ ...t, expenses: fn(t.expenses) }));

  const save = async (expense: Expense) => {
    if (await setExpenses((list) => upsertById(list, expense))) setForm({ open: false, initial: null });
  };

  const remove = async (expense: Expense) => {
    if (await confirm({ title: 'Excluir despesa?', message: `“${expense.description}” será removida.` })) {
      await setExpenses((list) => removeById(list, expense.id));
    }
  };

  const markPaid = (expense: Expense) =>
    void setExpenses((list) =>
      list.map((e) => {
        if (e.id !== expense.id) return e;
        if (e.status === 'installments' && e.paidInstallments < e.installments) {
          return { ...e, paidInstallments: e.paidInstallments + 1 };
        }
        return { ...e, status: 'paid' };
      }),
    );

  const addButton = (
    <button className="btn btn--primary" onClick={() => setForm({ open: true, initial: null })}>
      <Plus size={16} /> Adicionar
    </button>
  );

  const usage = summary.budgetUsage ?? 0;
  const budgetTone = usage > 1 ? 'danger' : usage > 0.85 ? 'warning' : 'default';

  return (
    <>
      <TabHeader title="Financeiro" subtitle={`Valores consolidados em ${trip.currency}.`} action={trip.expenses.length > 0 && addButton} />

      <div className="stats">
        <div className="stat">
          <span className="stat__label">Total registrado</span>
          <span className="stat__value">{money(summary.total)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Já pago</span>
          <span className="stat__value stat__value--positive">{money(summary.paid)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Saldo pendente</span>
          <span className="stat__value">{money(summary.pending)}</span>
        </div>
      </div>

      <div className="budget-card">
        {summary.budget !== null ? (
          <>
            <div className="budget-card__top">
              <div>
                <span className="stat__label">Orçamento estimado</span>
                <span className="budget-card__value">{money(summary.budget)}</span>
              </div>
              <div className="budget-card__right">
                <span className={`budget-card__pct budget-card__pct--${budgetTone}`}>{Math.round(usage * 100)}%</span>
                <span className="muted">
                  {summary.budgetRemaining! >= 0
                    ? `Restam ${money(summary.budgetRemaining!)}`
                    : `${money(-summary.budgetRemaining!)} acima do orçamento`}
                </span>
              </div>
            </div>
            <ProgressBar value={usage} tone={budgetTone} label="Uso do orçamento" />
          </>
        ) : (
          <p className="muted">Sem orçamento definido. Edite a viagem para informar um valor e acompanhar quanto já foi comprometido.</p>
        )}
      </div>

      {summary.unconverted.length > 0 && (
        <p className="notice">
          Fora dos totais por falta de cotação:{' '}
          {summary.unconverted.map((u) => `${formatMoney(u.total, u.currency)} (${u.count})`).join(', ')}. Edite essas despesas e
          informe a cotação para incluí-las.
        </p>
      )}

      {summary.byCategory.length > 1 && (
        <div className="categories">
          {summary.byCategory.map((c) => (
            <div key={c.category} className="category-row">
              <span className="category-row__name">{EXPENSE_CATEGORIES[c.category]}</span>
              <div className="category-row__bar">
                <span style={{ width: `${(c.total / summary.total) * 100}%` }} />
              </div>
              <span className="category-row__value">{money(c.total)}</span>
            </div>
          ))}
        </div>
      )}

      {trip.expenses.length === 0 ? (
        <EmptyState
          icon={<Wallet size={24} />}
          title="Nenhuma despesa registrada"
          text="Registre passagens, hospedagem, passeios e outros gastos — pagos, pendentes ou parcelados."
          action={addButton}
        />
      ) : (
        <>
          <div className="chips">
            {(['all', 'paid', 'pending', 'installments'] as StatusFilter[]).map((s) => (
              <button key={s} className={`chip ${filter === s ? 'is-active' : ''}`} onClick={() => setFilter(s)}>
                {s === 'all' ? 'Todas' : EXPENSE_STATUSES[s]}
              </button>
            ))}
          </div>
          <ul className="expense-list">
            {expenses.map((expense) => {
              const rate = conversionRate(expense, trip.currency);
              const actions: MenuAction[] = [
                { label: 'Editar', icon: <Pencil size={15} />, onSelect: () => setForm({ open: true, initial: expense }) },
              ];
              if (expense.status === 'pending' || (expense.status === 'installments' && expense.paidInstallments < expense.installments)) {
                actions.push({
                  label: expense.status === 'installments' ? 'Registrar parcela paga' : 'Marcar como pago',
                  icon: <CheckCircle2 size={15} />,
                  onSelect: () => markPaid(expense),
                });
              }
              actions.push({ label: 'Excluir', icon: <Trash2 size={15} />, onSelect: () => void remove(expense), danger: true });

              return (
                <li key={expense.id} className="expense">
                  <div className="expense__main">
                    <span className="expense__title">{expense.description}</span>
                    <span className="expense__meta">
                      {EXPENSE_CATEGORIES[expense.category]}
                      {expense.date && <> · {formatDate(expense.date)}</>}
                    </span>
                  </div>
                  <div className="expense__status">
                    <span className={`status status--${expense.status}`}>
                      {EXPENSE_STATUSES[expense.status]}
                      {expense.status === 'installments' && ` ${expense.paidInstallments}/${expense.installments}`}
                    </span>
                  </div>
                  <div className="expense__amount">
                    <span className="expense__value">{formatMoney(expense.amount, expense.currency)}</span>
                    {expense.currency !== trip.currency && (
                      <span className="expense__converted">{rate ? `≈ ${money(expense.amount * rate)}` : 'sem cotação'}</span>
                    )}
                    {expense.status === 'installments' && (
                      <span className="expense__converted">pago {formatMoney(paidPortion(expense), expense.currency)}</span>
                    )}
                  </div>
                  <Menu actions={actions} />
                </li>
              );
            })}
            {expenses.length === 0 && <li className="muted expense-list__empty">Nenhuma despesa com esse status.</li>}
          </ul>
        </>
      )}

      <ExportPdfButton trip={trip} section="finance" />

      <ExpenseFormModal
        open={form.open}
        initial={form.initial}
        tripCurrency={trip.currency}
        onClose={() => setForm({ open: false, initial: null })}
        onSubmit={(e) => void save(e)}
      />
    </>
  );
}
