import type { StoredFile } from '../../domain/types';
import type { ClaudeAssets, ClaudeDownloads } from '../../platform/claude';
import { downloadName, FileStoreError, triggerBrowserDownload, validateFile, type FileStore } from './FileStore';

/**
 * Arquivos no armazenamento de assets do Artifact no claude.ai (até 20 MB cada).
 * O `id` do asset fica salvo na viagem (área privada da conta); o arquivo é
 * servido em `/_blob/<id>` somente para quem tem acesso a este Artifact —
 * hoje, apenas o dono. Não existe link público.
 */
export class ClaudeAssetsFileStore implements FileStore {
  readonly available = true;
  // O claude.ai não permite incorporar documentos dentro da página: PDFs abrem em nova aba ou são baixados.
  readonly canPreviewPdf = false;

  constructor(
    private readonly assets: ClaudeAssets,
    private readonly downloads: ClaudeDownloads | null,
  ) {}

  private url(file: StoredFile) {
    return `/_blob/${file.id}`;
  }

  async save(file: File): Promise<StoredFile> {
    validateFile(file);
    try {
      const result = await this.assets.upload(file, { type: file.type });
      return { id: result.id, name: file.name, type: file.type, size: result.sizeBytes || file.size };
    } catch (error) {
      throw new FileStoreError(uploadMessage((error as { code?: string })?.code));
    }
  }

  async open(file: StoredFile) {
    return { url: this.url(file), release: () => {} };
  }

  async download(file: StoredFile) {
    if (!this.downloads) {
      triggerBrowserDownload(this.url(file), downloadName(file));
      return;
    }
    const response = await fetch(this.url(file));
    if (!response.ok) throw new FileStoreError('Arquivo não encontrado.');
    try {
      await this.downloads.save({ filename: downloadName(file), data: await response.blob() });
    } catch (error) {
      if ((error as { code?: string })?.code === 'declined') return;
      throw new FileStoreError('Não foi possível baixar o arquivo aqui.');
    }
  }

  async remove(file: StoredFile) {
    try {
      await this.assets.delete(file.id);
    } catch {
      // O documento já foi removido da viagem; um arquivo que sobrar não fica visível.
    }
  }
}

function uploadMessage(code: string | undefined) {
  switch (code) {
    case 'too_large':
      return 'Arquivo grande demais. O limite é de 20 MB por arquivo.';
    case 'unsupported_type':
      return 'Formato não suportado. Envie um PDF ou uma imagem (JPG, PNG, WEBP ou GIF).';
    case 'quota_or_state':
      return 'O espaço para arquivos está cheio. Exclua documentos que não usa mais.';
    case 'rate_limited':
      return 'Muitos envios seguidos. Aguarde um instante e tente de novo.';
    case 'upstream_auth':
      return 'Sua sessão expirou. Recarregue a página e tente de novo.';
    default:
      return 'Não foi possível enviar o arquivo. Tente de novo.';
  }
}
