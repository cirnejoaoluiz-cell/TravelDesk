import { useEffect, useState } from 'react';
import { CitySelect, NO_CITIES_HINT } from '../../../components/CitySelect';
import { Modal } from '../../../components/Modal';
import { Field, FieldRow, Select, TextArea, TextInput } from '../../../components/Field';
import { ACTIVITY_CATEGORIES } from '../../../domain/catalog';
import { emptyActivity } from '../../../domain/factories';
import { activityWarnings, type DayPlan } from '../../../domain/dayPlan';
import type { Activity, ActivityCategory } from '../../../domain/types';
import { formatWeekday } from '../../../lib/dates';
import { useFormState } from '../../../lib/useFormState';

interface Props {
  open: boolean;
  initial: Activity | null;
  defaults: Partial<Activity>;
  days: string[];
  /** Cidades da viagem atual (fonte única: `tripCities(trip)`). */
  cities: string[];
  /** Plano do dia (cidade, chegadas e partidas) calculado do Itinerário. */
  planFor(date: string): DayPlan | undefined;
  onClose(): void;
  onSubmit(activity: Activity): void;
}

export function ActivityFormModal({ open, initial, defaults, days, cities, planFor, onClose, onSubmit }: Props) {
  const { values, setField, setValues } = useFormState<Activity>(emptyActivity());
  const [error, setError] = useState('');
  // Enquanto a pessoa não escolher a cidade, uma atividade nova segue a cidade do dia escolhido.
  const [cityTouched, setCityTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(initial ?? { ...emptyActivity(), ...defaults });
    setError('');
    setCityTouched(Boolean(initial));
    // Reinicia o formulário somente ao abrir.
  }, [open]);

  const submit = () => {
    if (!values.title.trim()) {
      setError('Dê um nome para a atividade.');
      return;
    }
    onSubmit({ ...values, title: values.title.trim() });
  };

  const changeDate = (date: string) => {
    setField('date', date);
    if (!cityTouched) setField('city', planFor(date)?.city ?? '');
  };

  const plan = planFor(values.date);
  const timedArrivals = plan?.arrivals.filter((a) => a.arriveTime) ?? [];
  const warnings = activityWarnings(values, plan);

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
        <Field label="Cidade" hint={cities.length ? undefined : NO_CITIES_HINT}>
          <CitySelect
            cities={cities}
            value={values.city}
            onChange={(v) => {
              setCityTouched(true);
              setField('city', v);
            }}
            emptyLabel="Sem cidade definida"
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Dia">
          {dayOptions.length ? (
            <Select value={values.date} onChange={(e) => changeDate(e.target.value)}>
              <option value="">Sem dia definido</option>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {days.includes(d) ? `Dia ${days.indexOf(d) + 1} · ` : ''}
                  {formatWeekday(d)}
                </option>
              ))}
            </Select>
          ) : (
            <TextInput type="date" value={values.date} onChange={(e) => changeDate(e.target.value)} />
          )}
        </Field>
        <Field label="Horário">
          <TextInput type="time" value={values.time} onChange={(e) => setField('time', e.target.value)} />
        </Field>
      </FieldRow>

      {timedArrivals.length > 0 && (
        <p className="form-note">
          {timedArrivals.map((a) => `Chegada a ${a.to} às ${a.arriveTime}`).join(' · ')} (pelo Itinerário). Considere o tempo de
          desembarque, bagagem e check-in ao escolher o horário.
        </p>
      )}
      {warnings.length > 0 && (
        <p className="notice notice--compact">
          {warnings.join(' · ')}. Você pode salvar mesmo assim.
        </p>
      )}

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
