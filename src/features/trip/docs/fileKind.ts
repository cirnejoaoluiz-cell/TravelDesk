import { FileImage, FileText, File as FileIcon, type LucideIcon } from 'lucide-react';
import type { StoredFile } from '../../../domain/types';

export type FileKind = 'pdf' | 'image' | 'none';

export function fileKind(file: Pick<StoredFile, 'type'> | null): FileKind {
  if (!file) return 'none';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  return 'none';
}

export const FILE_KIND_ICONS: Record<FileKind, LucideIcon> = {
  pdf: FileText,
  image: FileImage,
  none: FileIcon,
};

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  pdf: 'PDF',
  image: 'Imagem',
  none: 'Sem arquivo',
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

/** "passagem-ida.pdf" → "passagem-ida" (sugestão de nome para o documento). */
export function nameFromFile(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
}
