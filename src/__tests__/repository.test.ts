import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageTripRepository, STORAGE_KEY } from '../data/LocalStorageTripRepository';
import { createTask, createTrip, emptyTripDraft } from '../domain/factories';

describe('LocalStorageTripRepository', () => {
  beforeEach(() => localStorage.clear());

  it('salva, lista, atualiza e remove viagens', async () => {
    const repo = new LocalStorageTripRepository(localStorage);
    const trip = await repo.save(createTrip({ ...emptyTripDraft(), name: 'Itália' }));
    expect(await repo.list()).toHaveLength(1);

    await repo.save({ ...trip, tasks: [createTask('Passaporte')] });
    const loaded = await repo.get(trip.id);
    expect(loaded?.tasks[0].title).toBe('Passaporte');

    // Os dados sobrevivem a uma nova instância (equivalente a recarregar a página).
    const reopened = new LocalStorageTripRepository(localStorage);
    expect((await reopened.list())[0].name).toBe('Itália');

    await repo.remove(trip.id);
    expect(await repo.list()).toEqual([]);
  });

  it('completa campos ausentes de dados antigos', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, trips: [{ id: 'old', name: 'Antiga' }] }));
    const [trip] = await new LocalStorageTripRepository(localStorage).list();
    expect(trip.expenses).toEqual([]);
    expect(trip.currency).toBe('BRL');
  });

  it('ignora dados corrompidos sem quebrar', async () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    expect(await new LocalStorageTripRepository(localStorage).list()).toEqual([]);
  });
});
