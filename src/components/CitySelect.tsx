import { cityOptions, selectedCity } from '../domain/destinations';
import { Select } from './Field';

interface CitySelectProps {
  /** Cidades da viagem atual (`tripCities(trip)`). */
  cities: string[];
  value: string;
  onChange(value: string): void;
  /** Texto da opção vazia (ex.: "Sem cidade específica"). */
  emptyLabel: string;
  id?: string;
  'aria-label'?: string;
}

/**
 * Menu de cidade baseado nas cidades cadastradas na viagem (sem digitação livre).
 * Um valor antigo que não está mais na lista continua selecionado e identificado,
 * para que editar o registro não apague a informação sem querer.
 */
export function CitySelect({ cities, value, onChange, emptyLabel, id, ...rest }: CitySelectProps) {
  const options = cityOptions(cities, value);
  return (
    <Select id={id} aria-label={rest['aria-label']} value={selectedCity(cities, value)} onChange={(e) => onChange(e.target.value)}>
      <option value="">{emptyLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

/** Dica exibida quando a viagem ainda não tem cidades cadastradas. */
export const NO_CITIES_HINT = 'Cadastre as cidades em “Editar viagem” para escolhê-las aqui.';
