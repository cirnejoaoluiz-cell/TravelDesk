import { normalizeTrip } from '../domain/factories';
import type { ID, Trip } from '../domain/types';
import { StorageQuotaError, type TripRepository } from './TripRepository';

export const STORAGE_KEY = 'traveldesk:data';
export const SCHEMA_VERSION = 1;

interface StoredData {
  version: number;
  trips: Trip[];
}

/**
 * Persistência no localStorage do navegador.
 * Todos os dados ficam em uma única chave (`traveldesk:data`) como JSON versionado,
 * o que facilita exportar, inspecionar e migrar.
 */
export class LocalStorageTripRepository implements TripRepository {
  constructor(
    private readonly storage: Storage = window.localStorage,
    private readonly key: string = STORAGE_KEY,
  ) {}

  private read(): Trip[] {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as Partial<StoredData>;
      // Ponto de migração: quando SCHEMA_VERSION mudar, converter `parsed` aqui.
      return (parsed.trips ?? []).map((t) => normalizeTrip(t as never));
    } catch {
      console.error('TravelDesk: dados corrompidos no armazenamento local.');
      return [];
    }
  }

  private write(trips: Trip[]) {
    const data: StoredData = { version: SCHEMA_VERSION, trips };
    try {
      this.storage.setItem(this.key, JSON.stringify(data));
    } catch (error) {
      if (error instanceof DOMException && /quota/i.test(error.name + error.message)) {
        throw new StorageQuotaError();
      }
      throw error;
    }
  }

  async list(): Promise<Trip[]> {
    return this.read();
  }

  async get(id: ID): Promise<Trip | null> {
    return this.read().find((t) => t.id === id) ?? null;
  }

  async save(trip: Trip): Promise<Trip> {
    const trips = this.read();
    const saved = { ...trip, updatedAt: new Date().toISOString() };
    const index = trips.findIndex((t) => t.id === trip.id);
    if (index >= 0) trips[index] = saved;
    else trips.push(saved);
    this.write(trips);
    return saved;
  }

  async remove(id: ID): Promise<void> {
    this.write(this.read().filter((t) => t.id !== id));
  }

  async replaceAll(trips: Trip[]): Promise<void> {
    this.write(trips.map((t) => normalizeTrip(t as never)));
  }
}
