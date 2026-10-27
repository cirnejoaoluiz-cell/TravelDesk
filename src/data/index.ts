import { LocalStorageTripRepository } from './LocalStorageTripRepository';
import type { TripRepository } from './TripRepository';

/**
 * Ponto único onde a implementação de persistência é escolhida.
 * Para migrar para a nuvem, crie p. ex. `SupabaseTripRepository implements TripRepository`
 * e troque a linha abaixo.
 */
export const tripRepository: TripRepository = new LocalStorageTripRepository();

export type { TripRepository } from './TripRepository';
export { StorageQuotaError } from './TripRepository';
