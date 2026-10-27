import type { ID, Trip } from '../domain/types';

/**
 * Contrato de persistência das viagens.
 *
 * A interface é assíncrona de propósito: hoje a implementação usa o
 * localStorage, mas uma versão em nuvem (Supabase, Firebase, API própria)
 * só precisa implementar estes mesmos métodos — nenhuma tela muda.
 */
export interface TripRepository {
  list(): Promise<Trip[]>;
  get(id: ID): Promise<Trip | null>;
  /** Cria ou substitui a viagem inteira (com todos os registros das abas). */
  save(trip: Trip): Promise<Trip>;
  remove(id: ID): Promise<void>;
  /** Substitui todos os dados (usado na importação de backup). */
  replaceAll(trips: Trip[]): Promise<void>;
}

export class StorageQuotaError extends Error {
  constructor() {
    super(
      'O armazenamento do navegador está cheio. Tente usar uma imagem de capa menor ou remover imagens de outras viagens.',
    );
    this.name = 'StorageQuotaError';
  }
}
