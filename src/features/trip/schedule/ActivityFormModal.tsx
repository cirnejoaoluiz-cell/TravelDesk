import { useEffect, useState } from 'react';
import { Modal } from '../../../components/Modal';
import { Field, FieldRow, Select, TextArea, TextInput } from '../../../components/Field';
import { ACTIVITY_CATEGORIES } from '../../../domain/catalog';
import { emptyActivity } from '../../../domain/factories';
import type { Activity, ActivityCategory } from '../../../domain/types';
import { formatWeekday } from '../../../lib/dates';
import { useFormState } from '../../../lib/useFormState';

interface Props {
  open: boolean;
  initial: Activity | null;
  defaults: Partial<Activity>;
  days: string[];
  cities: string[];
  onClose(): void;
  onSubmit(activity: Activity): void;
}

export function ActivityFormModal({ open, initial, defaults, days, cities, onClose, onSubmit }: Props) {
  const { values, setField, setValues } = useFormState<Activity>(emptyActivity());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValues(initial ?? { ...emptyActivity(), ...defaults });
    setError('');
    // Reinicia o formulário somente ao abrir.
  }, [open]);

  const submit = () => {
    if (!values.title.trim()) {
      setError('Dê um nome para a atividade.');
      return;
    }
    onSubmit({ ...values, title: values.title.trim(), city: values.city.trim() });
  };

  // Dias fora do período da viagem (ex.: data antiga) continuam selecionáveis.
  const dayOptions = values.date && !days.includes(values.date) ? [...days, values.date].sort() : days;

  return (
    <Modal open={open} title={initial ? 'Editar atividade' : 'Nova atividade'} onClose={onClose} onSubmit={submit}>
      <Field label="Atividade" error={error}>
        <TextInput
          value={values.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="Ex.: Coliseu, jantar no Trastevere…"
        />
      </Field>

      <FieldRow>
        <Field label="Categoria">
          <Select value={values.category} onChange={(e) => setField('category', e.target.value as ActivityCategory)}>
            {Object.entries(ACTIVITY_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cidade">
          <TextInput
            value={values.city}
            onChange={(e) => setField('city', e.target.value)}
            list="activity-cities"
            placeholder="Ex.: Roma"
          />
          <datalist id="activity-cities">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Dia">
          {dayOptions.length ? (
            <Select value={values.date} onChange={(e) => setField('date', e.target.value)}>
              <option value="">Sem dia definido</option>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {days.includes(d) ? `Dia ${days.indexOf(d) + 1} · ` : ''}
                  {formatWeekday(d)}
                </option>
              ))}
            </Select>
          ) : (
            <TextInput type="date" value={values.date} onChange={(e) => setField('date', e.target.value)} />
          )}
        </Field>
        <Field label="Horário">
          <TextInput type="time" value={values.time} onChange={(e) => setField('time', e.target.value)} />
        </Field>
      </FieldRow>

      <Field label="Endereço">
        <TextInput value={values.address} onChange={(e) => setField('address', e.target.value)} placeholder="Endereço ou nome do local" />
      </Field>
      <Field label="Link">
        <TextInput type="url" value={values.link} onChange={(e) => setField('link', e.target.value)} placeholder="Site, reserva, ingresso…" />
      </Field>
      <Field label="Observações">
        <TextArea value={values.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Reservar com antecedência, fecha às segundas…" />
      </Field>
    </Modal>
  );
}
