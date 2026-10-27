import type { StoredFile } from '../../domain/types';
import { createId } from '../../lib/id';
import { downloadName, FileStoreError, triggerBrowserDownload, validateFile, type FileStore } from './FileStore';

const DB_NAME = 'traveldesk-files';
const STORE = 'files';

interface FileRecord {
  id: string;
  blob: Blob;
}

/**
 * Arquivos no IndexedDB do navegador: aceita arquivos binários grandes
 * (centenas de MB, conforme o espaço do aparelho), sem passar pelos ~5 MB do
 * localStorage. Os arquivos ficam só neste navegador e nunca recebem link
 * público — são exibidos por endereços `blob:` temporários.
 */
export class IndexedDbFileStore implements FileStore {
  readonly available = true;
  readonly canPreviewPdf = true;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }

  private async run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async save(file: File): Promise<StoredFile> {
    validateFile(file);
    const id = createId();
    try {
      await this.run('readwrite', (store) => store.put({ id, blob: file } satisfies FileRecord));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new FileStoreError('Sem espaço no navegador para este arquivo. Exclua documentos que não usa mais.');
      }
      throw new FileStoreError('Não foi possível guardar o arquivo neste navegador.');
    }
    return { id, name: file.name, type: file.type, size: file.size };
  }

  private async blob(file: StoredFile): Promise<Blob | null> {
    const record = (await this.run('readonly', (store) => store.get(file.id))) as FileRecord | undefined;
    return record?.blob ?? null;
  }

  async open(file: StoredFile) {
    const blob = await this.blob(file);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    return { url, release: () => URL.revokeObjectURL(url) };
  }

  async download(file: StoredFile) {
    const handle = await this.open(file);
    if (!handle) throw new FileStoreError('Arquivo não encontrado neste navegador.');
    triggerBrowserDownload(handle.url, downloadName(file));
    // Dá tempo ao navegador de iniciar o download antes de liberar o endereço.
    window.setTimeout(handle.release, 60_000);
  }

  async remove(file: StoredFile) {
    await this.run('readwrite', (store) => store.delete(file.id));
  }
}
