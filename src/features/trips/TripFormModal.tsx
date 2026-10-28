import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Field, FieldRow, Select, TextArea, TextInput } from '../../components/Field';
import { TagInput } from '../../components/TagInput';
import { CURRENCIES } from '../../domain/catalog';
import { findTripCity, tripCities } from '../../domain/destinations';
import { emptyTripDraft, toTripDraft } from '../../domain/factories';
import type { CurrencyCode, TripDraft } from '../../domain/types';
import { compressImage } from '../../lib/image';
import { parseMoneyInput, toMoneyInput } from '../../lib/money';
import { useFormState } from '../../lib/useFormState';

interface TripFormModalProps {
  open: boolean;
  initial?: TripDraft;
  /** Quantos registros da viagem usam a cidade (para avisar ao removê-la da lista). */
  cityUsage?(city: string): number;
  onClose(): void;
  onSubmit(draft: TripDraft): Promise<void> | void;
}

export function TripFormModal({ open, initial, cityUsage, onClose, onSubmit }: TripFormModalProps) {
  const isEdit = Boolean(initial);
  const { values, setField, setValues } = useFormState<TripDraft>(initial ?? emptyTripDraft());
  const [budgetText, setBudgetText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageError, setImageError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const start = initial ? toTripDraft(initial) : emptyTripDraft();
    setValues(start);
    setBudgetText(toMoneyInput(start.budget));
    setErrors({});
    setImageError('');
    // Reinicia o formulário somente ao abrir.
  }, [open]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImageError('');
    try {
      setField('coverImage', await compressImage(file));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Imagem inválida.');
    }
  };

  // Cidades retiradas da lista que ainda estão em registros desta viagem.
  const removedInUse = (initial && cityUsage ? tripCities(initial) : [])
    .filter((city) => !findTripCity(tripCities(values), city))
    .map((city) => ({ city, count: cityUsage!(city) }))
    .filter((c) => c.count > 0);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = 'Dê um nome para a viagem.';
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      next.endDate = 'A volta precisa ser depois da ida.';
    }
    const budget = parseMoneyInput(budgetText);
    if (budgetText.trim() && (budget === null || budget < 0)) next.budget = 'Valor inválido.';
    setErrors(next);
    if (Object.keys(next).length) return;
    await onSubmit({ ...toTripDraft(values), name: values.name.trim(), budget, description: values.description.trim() });
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar viagem' : 'Nova viagem'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={isEdit ? 'Salvar alterações' : 'Criar viagem'}
      size="lg"
    >
      <div className="cover-picker">
        {values.coverImage ? (
          <div className="cover-picker__preview" style={{ backgroundImage: `url("${values.coverImage}")` }}>
            <div className="cover-picker__actions">
              <button type="button" className="btn btn--glass btn--sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={15} /> Trocar
              </button>
              <button
                type="button"
                className="btn btn--glass btn--sm"
                onClick={() => setField('coverImage', null)}
                aria-label="Remover imagem"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="cover-picker__empty" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={20} />
            <span>Adicionar imagem de capa</span>
            <small>Opcional · JPG ou PNG</small>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {imageError && <span className="field__error">{imageError}</span>}
      </div>

      <Field label="Nome da viagem" error={errors.name}>
        <TextInput
          value={values.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="Ex.: Férias na Itália"
          autoFocus
        />
      </Field>

      <Field
        label="Destinos (cidades da viagem)"
        group
        hint="Pressione Enter ou vírgula para adicionar mais de uma. Essas cidades aparecem para seleção no Itinerário, no Roteiro e no Financeiro."
      >
        <TagInput
          value={values.destinations}
          onChange={(v) => setField('destinations', v)}
          placeholder="Ex.: Roma, Florença, Veneza"
          ariaLabel="Destinos"
        />
      </Field>
      {removedInUse.length > 0 && (
        <p className="notice notice--compact">
          {removedInUse.map(({ city, count }) => `${city} (${count} ${count === 1 ? 'registro' : 'registros'})`).join(', ')}{' '}
          {removedInUse.length === 1 ? 'continua' : 'continuam'} em uso nesta viagem. Os registros não serão apagados: eles mantêm a
          cidade, que passa a aparecer como “fora da lista da viagem” até você escolher outra.
        </p>
      )}

      <FieldRow>
        <Field label="Data de ida">
          <TextInput type="date" value={values.startDate} onChange={(e) => setField('startDate', e.target.value)} />
        </Field>
        <Field label="Data de volta" error={errors.endDate}>
          <TextInput
            type="date"
            value={values.endDate}
            min={values.startDate || undefined}
            onChange={(e) => setField('endDate', e.target.value)}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Orçamento estimado" error={errors.budget}>
          <TextInput
            inputMode="decimal"
            value={budgetText}
            onChange={(e) => setBudgetText(e.target.value)}
            placeholder="0,00"
          />
        </Field>
        <Field label="Moeda principal">
          <Select value={values.currency} onChange={(e) => setField('currency', e.target.value as CurrencyCode)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </FieldRow>

      <Field label="Descrição ou observações">
        <TextArea
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Motivo da viagem, quem vai, ideias gerais…"
        />
      </Field>
    </Modal>
  );
}
