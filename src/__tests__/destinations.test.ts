import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageTripRepository, STORAGE_KEY } from '../data/LocalStorageTripRepository';
import { cityOptions, cityUsage, findTripCity, selectedCity, tripCities } from '../domain/destinations';
import { createTrip, emptyActivity, emptyExpense, emptyItineraryItem, emptyTripDraft } from '../domain/factories';

describe('cidades da viagem', () => {
  beforeEach(() => localStorage.clear());

  it('usa a lista da própria viagem, sem vazios nem repetições', () => {
    expect(tripCities({ destinations: ['Roma', ' roma ', '', 'Florença', 'Veneza'] })).toEqual(['Roma', 'Florença', 'Veneza']);
  });

  it('reconhece a cidade ignorando maiúsculas e espaços, sem alterar a grafia cadastrada', () => {
    const cities = ['São Paulo', 'Roma'];
    expect(findTripCity(cities, ' são  paulo ')).toBe('São Paulo');
    expect(findTripCity(cities, 'Paris')).toBeNull();
    expect(selectedCity(cities, 'roma')).toBe('Roma');
  });

  it('mantém visível uma cidade que saiu da lista, sem apagá-la do registro', () => {
    const options = cityOptions(['Roma'], 'Veneza');
    expect(options.map((o) => o.value)).toEqual(['Roma', 'Veneza']);
    expect(options[1]).toMatchObject({ outsideTrip: true, label: 'Veneza (fora da lista da viagem)' });
    expect(cityOptions(['Roma'], '')).toHaveLength(1);
  });

  it('conta os registros que usam cada cidade', () => {
    const trip = {
      itinerary: [{ ...emptyItineraryItem(), origin: 'Roma', destination: 'Veneza' }, { ...emptyItineraryItem(), destination: 'roma' }],
      activities: [{ ...emptyActivity(), city: 'Roma' }],
      expenses: [{ ...emptyExpense('BRL'), city: 'Roma' }, { ...emptyExpense('BRL') }],
    };
    expect(cityUsage(trip, 'Roma')).toBe(4);
    expect(cityUsage(trip, 'Veneza')).toBe(1);
    expect(cityUsage(trip, 'Paris')).toBe(0);
  });

  it('despesas antigas (sem cidade) carregam normalmente e a cidade é salva', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, trips: [{ id: 'v', name: 'V', destinations: ['Roma'], expenses: [{ id: 'e', description: 'Hotel', amount: 10 }] }] }),
    );
    const repo = new LocalStorageTripRepository(localStorage);
    const [trip] = await repo.list();
    expect(trip.expenses[0].city).toBe('');
    await repo.save({ ...trip, expenses: [{ ...trip.expenses[0], city: 'Roma' }] });
    expect((await repo.list())[0].expenses[0].city).toBe('Roma');
  });

  it('cada viagem tem sua própria lista', () => {
    const a = createTrip({ ...emptyTripDraft(), name: 'A', destinations: ['Roma'] });
    const b = createTrip({ ...emptyTripDraft(), name: 'B', destinations: ['Lisboa'] });
    expect(tripCities(a)).toEqual(['Roma']);
    expect(tripCities(b)).toEqual(['Lisboa']);
  });
});
