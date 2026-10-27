/**
 * Acesso aos recursos do claude.ai quando o TravelDesk roda publicado como Artifact.
 * Fora do claude.ai (`npm run dev`, hospedagem própria) tudo aqui resolve `null`
 * e o app usa os equivalentes do navegador.
 */

export interface ClaudeDbError {
  code: string;
  message: string;
}

export interface DocSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

export interface DocRef {
  id: string;
  get(): Promise<DocSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}

export interface CollectionRef {
  doc(id: string): DocRef;
  where(field: string, op: string, value: unknown): { get(): Promise<{ docs: DocSnapshot[] }> };
  get(): Promise<{ docs: DocSnapshot[] }>;
}

export interface ClaudeDb {
  collection(path: string): CollectionRef;
}

export interface ClaudeUser {
  id(): Promise<string | null>;
}

export interface ClaudeDownloads {
  save(request: { filename: string; data: string | Blob }): Promise<unknown>;
}

interface CapabilityMap {
  db: ClaudeDb;
  user: ClaudeUser;
  downloads: ClaudeDownloads;
}

declare global {
  interface Window {
    claude?: { use?(name: string): Promise<unknown> };
  }
}

export async function useCapability<K extends keyof CapabilityMap>(name: K): Promise<CapabilityMap[K] | null> {
  try {
    const use = window.claude?.use;
    if (typeof use !== 'function') return null;
    return ((await use.call(window.claude, name)) as CapabilityMap[K] | null) ?? null;
  } catch {
    return null;
  }
}
