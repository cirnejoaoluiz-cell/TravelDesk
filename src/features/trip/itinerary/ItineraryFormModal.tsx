import { useEffect, useState } from 'react';
import { CitySelect, NO_CITIES_HINT } from '../../../components/CitySelect';
import { Modal } from '../../../components/Modal';
import { Field, FieldRow, TextArea, TextInput } from '../../../components/Field';
import { ITINERARY_TYPES } from '../../../domain/catalog';
import { emptyItineraryItem } from '../../../domain/factories';
import type { ItineraryItem, ItineraryType } from '../../../domain/types';
import { useFormState } from '../../../lib/useFormState';
import { ITINERARY_ICONS } from '../icons';

interface Props {
  open: boolean;
  initial: ItineraryItem | null;
  defaultDate: string;
  /** Cidades da viagem atual (fonte única: `tripCities(trip)`). */
  cities: string[];
  onClose(): void;
  onSubmit(item: ItineraryItem): void;
}

export function ItineraryFormModal({ open, initial, defaultDate, cities, onClose, onSubmit }: Props) {
  const { values, setField, setValues } = useFormState<ItineraryItem>(emptyItineraryItem());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValues(initial ?? { ...emptyItineraryItem(), startDate: defaultDate });
    setError('');
    // Reinicia o formulário somente ao abrir.
  }, [open]);

  const isTransport = ITINERARY_TYPES[values.type].isTransport;
  const isLodging = values.type === 'lodging';

  const submit = () => {
    if (!values.title.trim() && !values.origin.trim() && !values.destination.trim()) {
      setError(isLodging ? 'Informe o nome da hospedagem.' : 'Informe um título ou escolha a origem/destino.');
      return;
    }
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      setError('A data final precisa ser igual ou posterior à inicial.');
      return;
    }
    // Hospedagem e outros não têm origem: não guarda um valor que ficou escondido ao trocar o tipo.
    onSubmit({ ...values, title: values.title.trim(), origin: isTransport ? values.origin : '' });
  };

  const startLabel = isLodging ? 'Check-in' : isTransport ? 'Partida' : 'Início';
  const endLabel = isLodging ? 'Check-out' : isTransport ? 'Chegada' : 'Fim';

  return (
    <Modal
      open={open}
      title={initial ? 'Editar registro' : 'Novo registro no itinerário'}
      onClose={onClose}
      onSubmit={submit}
      size="lg"
    >
      <div className="type-picker" role="radiogroup" aria-label="Tipo">
        {(Object.keys(ITINERARY_TYPES) as ItineraryType[]).map((type) => {
          const Icon = ITINERARY_ICONS[type];
          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={values.type === type}
              className={`type-picker__option ${values.type === type ? 'is-active' : ''}`}
              onClick={() => setField('type', type)}
            >
              <Icon size={18} />
              <span>{ITINERARY_TYPES[type].label}</span>
            </button>
          );
        })}
      </div>

      <FieldRow>
        <Field label={isLodging ? 'Nome da hospedagem' : 'Título'} error={error}>
          <TextInput
            value={values.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder={isLodging ? 'Ex.: Hotel Artemide' : 'Ex.: Voo de ida'}
          />
        </Field>
        <Field label={isLodging ? 'Plataforma / rede' : 'Companhia / empresa'}>
          <TextInput
            value={values.provider}
            onChange={(e) => setField('provider', e.target.value)}
            placeholder={isLodging ? 'Ex.: Booking, Airbnb' : 'Ex.: ITA Airways'}
          />
        </Field>
      </FieldRow>

      {isTransport ? (
        <FieldRow>
          <Field label="Origem" hint={cities.length ? undefined : NO_CITIES_HINT}>
            <CitySelect cities={cities} value={values.origin} onChange={(v) => setField('origin', v)} emptyLabel="Selecione a cidade" />
          </Field>
          <Field label="Destino">
            <CitySelect
              cities={cities}
              value={values.destination}
              onChange={(v) => setField('destination', v)}
              emptyLabel="Selecione a cidade"
            />
          </Field>
        </FieldRow>
      ) : (
        <Field label="Cidade" hint={cities.length ? undefined : NO_CITIES_HINT}>
          <CitySelect
            cities={cities}
            value={values.destination}
            onChange={(v) => setField('destination', v)}
            emptyLabel="Selecione a cidade"
          />
        </Field>
      )}

      <FieldRow>
        <Field label={`${startLabel} — data`}>
          <TextInput type="date" value={values.startDate} onChange={(e) => setField('startDate', e.target.value)} />
        </Field>
        <Field label="Horário">
          <TextInput type="time" value={values.startTime} onChange={(e) => setField('startTime', e.target.value)} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label={`${endLabel} — data`}>
          <TextInput
            type="date"
            value={values.endDate}
            min={values.startDate || undefined}
            onChange={(e) => setField('endDate', e.target.value)}
          />
        </Field>
        <Field label="Horário">
          <TextInput type="time" value={values.endTime} onChange={(e) => setField('endTime', e.target.value)} />
        </Field>
      </FieldRow>

      <Field label="Endereço">
        <TextInput
          value={values.address}
          onChange={(e) => setField('address', e.target.value)}
          placeholder={isLodging ? 'Endereço da hospedagem' : 'Terminal, estação ou ponto de encontro'}
        />
      </Field>

      <FieldRow>
        <Field label="Localizador / código da reserva">
          <TextInput
            value={values.confirmationCode}
            onChange={(e) => setField('confirmationCode', e.target.value.toUpperCase())}
            placeholder="Ex.: XK7P2Q"
          />
        </Field>
        <Field label="Link">
          <TextInput type="url" value={values.link} onChange={(e) => setField('link', e.target.value)} placeholder="https://" />
        </Field>
      </FieldRow>

      <Field label="Observações">
        <TextArea
          value={values.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder="Bagagem, assento, café da manhã incluso…"
        />
      </Field>
    </Modal>
  );
}
