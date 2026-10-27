import { useCapability } from '../platform/claude';
import { ClaudeDbTripRepository } from './ClaudeDbTripRepository';
import { ClaudeAssetsFileStore } from './files/ClaudeAssetsFileStore';
import { UnavailableFileStore, type FileStore } from './files/FileStore';
import { IndexedDbFileStore } from './files/IndexedDbFileStore';
import { LocalStorageTripRepository } from './LocalStorageTripRepository';
import type { TripRepository } from './TripRepository';

export type StorageKind = 'account' | 'browser';

export interface ResolvedRepository {
  repository: TripRepository;
  /** Onde ficam os anexos da aba Docs (sempre ao lado dos dados das viagens). */
  files: FileStore;
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
    if (db && userId) {
      // Arquivos no claude.ai: assets do Artifact (disponível para quem pode editar a página).
      const [assets, downloads] = await Promise.all([useCapability('assets'), useCapability('downloads')]);
      return {
        repository: new ClaudeDbTripRepository(db, userId),
        files: assets ? new ClaudeAssetsFileStore(assets, downloads) : new UnavailableFileStore(),
        kind: 'account' as const,
      };
    }
    // Pede ao navegador para não apagar os dados automaticamente por falta de espaço ou inatividade.
    void navigator.storage?.persist?.().catch(() => undefined);
    return {
      repository: new LocalStorageTripRepository(),
      files: typeof indexedDB !== 'undefined' ? new IndexedDbFileStore() : new UnavailableFileStore(),
      kind: 'browser' as const,
    };
  })();
  return resolved;
}

export type { TripRepository } from './TripRepository';
export type { FileStore } from './files/FileStore';
export { StorageQuotaError } from './TripRepository';
