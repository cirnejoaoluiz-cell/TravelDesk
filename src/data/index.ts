import { useCapability } from '../platform/claude';
import { ClaudeDbTripRepository } from './ClaudeDbTripRepository';
import { LocalStorageTripRepository } from './LocalStorageTripRepository';
import type { TripRepository } from './TripRepository';

export type StorageKind = 'account' | 'browser';

export interface ResolvedRepository {
  repository: TripRepository;
  kind: StorageKind;
}

let resolved: Promise<ResolvedRepository> | null = null;

/**
 * Ponto único onde a implementação de persistência é escolhida:
 * - publicado no claude.ai → banco da conta (sincroniza entre dispositivos);
 * - em qualquer outro lugar → localStorage do navegador.
 * Para um banco próprio na nuvem, crie outra classe que implemente
 * `TripRepository` e escolha-a aqui.
 */
export function getTripRepository(): Promise<ResolvedRepository> {
  resolved ??= (async () => {
    const [db, user] = await Promise.all([useCapability('db'), useCapability('user')]);
    const userId = user ? await user.id().catch(() => null) : null;
    if (db && userId) return { repository: new ClaudeDbTripRepository(db, userId), kind: 'account' as const };
    // Pede ao navegador para não apagar os dados automaticamente por falta de espaço ou inatividade.
    void navigator.storage?.persist?.().catch(() => undefined);
    return { repository: new LocalStorageTripRepository(), kind: 'browser' as const };
  })();
  return resolved;
}

export type { TripRepository } from './TripRepository';
export { StorageQuotaError } from './TripRepository';
