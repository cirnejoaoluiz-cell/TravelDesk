import type { Trip } from './types';

/**
 * Cidades da viagem: fonte única para todos os módulos.
 *
 * A lista vive em `trip.destinations` (cadastrada no formulário da viagem).
 * Os registros (itinerário, roteiro, despesas) guardam o nome da cidade
 * escolhida; nenhum módulo mantém uma cópia própria da lista.
 */

const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

/** Cidades cadastradas na viagem, sem vazios nem repetições (mantém a grafia e a ordem cadastradas). */
export function tripCities(trip: Pick<Trip, 'destinations'>): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const raw of trip.destinations) {
    const name = raw.trim();
    if (!name || seen.has(key(name))) continue;
    seen.add(key(name));
    list.push(name);
  }
  return list;
}

/**
 * Nome cadastrado que corresponde a `value` (ignorando maiúsculas e espaços extras),
 * ou `null` se a cidade não faz parte da viagem.
 */
export function findTripCity(cities: string[], value: string): string | null {
  if (!value.trim()) return null;
  return cities.find((c) => key(c) === key(value)) ?? null;
}

export interface CityOption {
  value: string;
  label: string;
  /** Cidade que o registro já tinha, mas que não está (mais) na lista da viagem. */
  outsideTrip: boolean;
}

/**
 * Opções do menu de cidade para um registro.
 * Se o registro já guarda uma cidade fora da lista (removida da viagem ou digitada
 * antes desta melhoria), ela continua aparecendo para não ser apagada por engano.
 */
export function cityOptions(cities: string[], current: string): CityOption[] {
  const options = cities.map((c) => ({ value: c, label: c, outsideTrip: false }));
  if (current.trim() && !findTripCity(cities, current)) {
    options.push({ value: current, label: `${current} (fora da lista da viagem)`, outsideTrip: true });
  }
  return options;
}

/** Valor a exibir no menu: a grafia cadastrada quando a cidade é da viagem; senão, o valor original. */
export function selectedCity(cities: string[], current: string): string {
  return findTripCity(cities, current) ?? current;
}

/** Quantos registros de cada módulo usam a cidade (para avisar antes de removê-la da viagem). */
export function cityUsage(trip: Pick<Trip, 'itinerary' | 'activities' | 'expenses'>, city: string): number {
  const match = (value: string | undefined) => Boolean(value) && key(value!) === key(city);
  return (
    trip.itinerary.filter((i) => match(i.origin) || match(i.destination)).length +
    trip.activities.filter((a) => match(a.city)).length +
    trip.expenses.filter((e) => match(e.city)).length
  );
}
