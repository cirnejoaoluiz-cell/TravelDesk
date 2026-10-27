import type { StoredFile } from '../../domain/types';

/**
 * Contrato do armazenamento de arquivos (anexos da aba Docs).
 *
 * Os arquivos ficam fora da viagem: a viagem guarda só um `StoredFile`
 * (id, nome, tipo, tamanho). Assim o armazenamento de dados continua leve e
 * cada lado pode migrar sozinho — por exemplo, para um bucket privado em
 * nuvem (Supabase Storage, S3 com URLs assinadas) implementando esta interface.
 */
export interface FileStore {
  /** `false` quando este ambiente não consegue guardar arquivos. */
  readonly available: boolean;
  /** Se o PDF pode ser exibido dentro da página (senão: abrir em nova aba ou baixar). */
  readonly canPreviewPdf: boolean;
  /** Guarda o arquivo e devolve a referência a ser salva na viagem. */
  save(file: File): Promise<StoredFile>;
  /**
   * Endereço para exibir o arquivo nesta sessão, ou `null` se ele não estiver
   * neste armazenamento (ex.: backup importado de outro aparelho).
   * Chame `release` quando não precisar mais do endereço.
   */
  open(file: StoredFile): Promise<{ url: string; release(): void } | null>;
  /** Oferece o arquivo para download. */
  download(file: StoredFile): Promise<void>;
  /** Remove o arquivo. Não falha se ele já não existir. */
  remove(file: StoredFile): Promise<void>;
}

/** Tipos aceitos: PDF e imagens comuns (os mesmos que o armazenamento do claude.ai aceita). */
export const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** 20 MB: limite por arquivo do armazenamento do claude.ai, aplicado também no navegador. */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

export class FileStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileStoreError';
  }
}

export function validateFile(file: File) {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    throw new FileStoreError('Formato não suportado. Envie um PDF ou uma imagem (JPG, PNG, WEBP ou GIF).');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new FileStoreError('Arquivo grande demais. O limite é de 20 MB por arquivo.');
  }
  if (file.size === 0) throw new FileStoreError('O arquivo está vazio.');
}

/** Usado quando não há onde guardar arquivos: deixa claro em vez de simular. */
export class UnavailableFileStore implements FileStore {
  readonly available = false;
  readonly canPreviewPdf = false;
  async save(): Promise<StoredFile> {
    throw new FileStoreError('Este ambiente não permite guardar arquivos.');
  }
  async open() {
    return null;
  }
  async download() {
    throw new FileStoreError('Arquivo não disponível neste ambiente.');
  }
  async remove() {}
}

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Garante que o nome do arquivo termine com a extensão do tipo (necessário para baixar). */
export function downloadName(file: StoredFile) {
  const ext = EXTENSIONS[file.type];
  if (!ext || new RegExp(`\\.${ext === 'jpg' ? 'jpe?g' : ext}$`, 'i').test(file.name)) return file.name;
  return `${file.name}.${ext}`;
}

/** Download pelo navegador a partir de um endereço (blob: ou do mesmo site). */
export function triggerBrowserDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
