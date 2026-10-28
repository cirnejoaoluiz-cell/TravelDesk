import { useEffect, useState } from 'react';
import { CitySelect, NO_CITIES_HINT } from '../../../components/CitySelect';
import { Modal } from '../../../components/Modal';
import { Field, FieldRow, Select, TextArea, TextInput } from '../../../components/Field';
import { CURRENCIES, EXPENSE_CATEGORIES, EXPENSE_STATUSES } from '../../../domain/catalog';
import { emptyExpense } from '../../../domain/factories';
import { installmentValue } from '../../../domain/finance';
import type { CurrencyCode, Expense, ExpenseCategory, ExpenseStatus } from '../../../domain/types';
import { formatMoney, parseMoneyInput, toMoneyInput } from '../../../lib/money';
import { useFormState } from '../../../lib/useFormState';

interface Props {
  open: boolean;
  initial: Expense | null;
  tripCurrency: CurrencyCode;
  /** Cidades da viagem atual (fonte única: `tripCities(trip)`). */
  cities: string[];
  onClose(): void;
  onSubmit(expense: Expense): void;
}

export function ExpenseFormModal({ open, initial, tripCurrency, cities, onClose, onSubmit }: Props) {
  const { values, setField, setValues } = useFormState<Expense>(emptyExpense(tripCurrency));
  const [amountText, setAmountText] = useState('');
  const [rateText, setRateText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const start = initial ?? emptyExpense(tripCurrency);
    setValues(start);
    setAmountText(initial ? toMoneyInput(start.amount) : '');
    setRateText(toMoneyInput(start.exchangeRate, 4));
    setErrors({});
    // Reinicia o formulário somente ao abrir.
  }, [open]);

  const foreign = values.currency !== tripCurrency;
  const amount = parseMoneyInput(amountText);

  const submit = () => {
    const next: Record<string, string> = {};
    if (!values.description.trim()) next.description = 'Descreva a despesa.';
    if (amount === null || amount <= 0) next.amount = 'Informe um valor maior que zero.';
    const rate = parseMoneyInput(rateText);
    if (foreign && rateText.trim() && (rate === null || rate <= 0)) next.rate = 'Cotação inválida.';
    let installments = values.installments;
    let paidInstallments = values.paidInstallments;
    if (values.status === 'installments') {
      installments = Math.floor(Number(installments));
      paidInstallments = Math.floor(Number(paidInstallments));
      if (!(installments >= 2)) next.installments = 'Mínimo de 2 parcelas.';
      else if (!(paidInstallments >= 0 && paidInstallments <= installments)) next.paidInstallments = `Entre 0 e ${installments}.`;
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({
      ...values,
      description: values.description.trim(),
      amount: amount ?? 0,
      exchangeRate: foreign ? rate : null,
      installments,
      paidInstallments,
    });
  };

  return (
    <Modal open={open} title={initial ? 'Editar despesa' : 'Nova despesa'} onClose={onClose} onSubmit={submit} size="lg">
      <Field label="Descrição" error={errors.description}>
        <TextInput
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Ex.: Passagem São Paulo – Roma"
        />
      </Field>

      <FieldRow cols={3}>
        <Field label="Categoria">
          <Select value={values.category} onChange={(e) => setField('category', e.target.value as ExpenseCategory)}>
            {Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valor" error={errors.amount}>
          <TextInput inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Moeda">
          <Select value={values.currency} onChange={(e) => setField('currency', e.target.value as CurrencyCode)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </Select>
        </Field>
      </FieldRow>

      {foreign && (
        <Field
          label={`Cotação: 1 ${values.currency} = ? ${tripCurrency}`}
          error={errors.rate}
          hint={
            rateText.trim()
              ? amount && parseMoneyInput(rateText)
                ? `≈ ${formatMoney(amount * (parseMoneyInput(rateText) ?? 0), tripCurrency)} no total`
                : undefined
              : 'Opcional. Sem cotação, a despesa aparece separada e não entra nos totais.'
          }
        >
          <TextInput inputMode="decimal" value={rateText} onChange={(e) => setRateText(e.target.value)} placeholder="Ex.: 5,45" />
        </Field>
      )}

      <FieldRow>
        <Field label="Cidade (opcional)" hint={cities.length ? undefined : NO_CITIES_HINT}>
          <CitySelect
            cities={cities}
            value={values.city}
            onChange={(v) => setField('city', v)}
            emptyLabel="Sem cidade específica"
          />
        </Field>
        <Field label="Data">
          <TextInput type="date" value={values.date} onChange={(e) => setField('date', e.target.value)} />
        </Field>
      </FieldRow>

      <Field label="Status" group>
        <div className="segmented" role="radiogroup" aria-label="Status">
          {(Object.keys(EXPENSE_STATUSES) as ExpenseStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              role="radio"
              aria-checked={values.status === status}
              className={values.status === status ? 'is-active' : ''}
              onClick={() => setField('status', status)}
            >
              {EXPENSE_STATUSES[status]}
            </button>
          ))}
        </div>
      </Field>

      {values.status === 'installments' && (
        <FieldRow>
          <Field
            label="Número de parcelas"
            error={errors.installments}
            hint={amount && values.installments >= 2 ? `${values.installments}× de ${formatMoney(installmentValue({ ...values, amount }), values.currency)}` : undefined}
          >
            <TextInput
              type="number"
              min={2}
              max={48}
              value={values.installments || ''}
              onChange={(e) => setField('installments', Number(e.target.value))}
            />
          </Field>
          <Field label="Parcelas já pagas" error={errors.paidInstallments}>
            <TextInput
              type="number"
              min={0}
              max={values.installments}
              value={Number.isFinite(values.paidInstallments) ? values.paidInstallments : ''}
              onChange={(e) => setField('paidInstallments', Number(e.target.value))}
            />
          </Field>
        </FieldRow>
      )}

      <Field label="Observações">
        <TextArea value={values.notes} onChange={(e) => setField('notes', e.target.value)} rows={2} />
      </Field>
    </Modal>
  );
}
