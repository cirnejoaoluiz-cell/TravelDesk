import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileWarning } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import type { FileStore } from '../../../data';
import { DOCUMENT_CATEGORIES } from '../../../domain/catalog';
import type { TripDocument } from '../../../domain/types';
import { FILE_KIND_ICONS, FILE_KIND_LABELS, fileKind, formatBytes } from './fileKind';

interface Props {
  doc: TripDocument | null;
  files: FileStore;
  onClose(): void;
  onDownload(doc: TripDocument): void;
}

type ViewState = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; url: string };

export function DocumentViewerModal({ doc, files, onClose, onDownload }: Props) {
  const [view, setView] = useState<ViewState>({ status: 'loading' });
  const file = doc?.file ?? null;

  useEffect(() => {
    if (!file) return;
    let release: (() => void) | undefined;
    let cancelled = false;
    setView({ status: 'loading' });
    files
      .open(file)
      .then((handle) => {
        if (cancelled) return handle?.release();
        release = handle?.release;
        setView(handle ? { status: 'ready', url: handle.url } : { status: 'missing' });
      })
      .catch(() => !cancelled && setView({ status: 'missing' }));
    return () => {
      cancelled = true;
      release?.();
    };
  }, [file, files]);

  const kind = fileKind(file);
  const Icon = FILE_KIND_ICONS[kind];
  const ready = view.status === 'ready';

  return (
    <Modal
      open={doc !== null}
      title={doc?.name ?? ''}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {ready && (
            <a className="btn btn--ghost" href={view.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> Abrir em nova aba
            </a>
          )}
          <button type="button" className="btn btn--primary" onClick={() => doc && onDownload(doc)} disabled={!ready}>
            <Download size={15} /> Baixar
          </button>
        </>
      }
    >
      {doc && file && (
        <>
          <p className="viewer__meta">
            {DOCUMENT_CATEGORIES[doc.category]} · {FILE_KIND_LABELS[kind]} · {formatBytes(file.size)}
          </p>
          {doc.description && <p className="viewer__desc">{doc.description}</p>}

          <div className="viewer">
            {view.status === 'loading' && <p className="muted">Carregando…</p>}
            {view.status === 'missing' && (
              <div className="viewer__placeholder">
                <FileWarning size={28} />
                <p>Arquivo não encontrado neste aparelho.</p>
                <small>Ele pode ter sido adicionado em outro dispositivo ou vindo de um backup sem os arquivos.</small>
              </div>
            )}
            {ready && kind === 'image' && (
              <img
                className="viewer__image"
                src={view.url}
                alt={doc.name}
                onError={() => setView({ status: 'missing' })}
              />
            )}
            {ready && kind === 'pdf' && files.canPreviewPdf && (
              <iframe className="viewer__pdf" src={view.url} title={doc.name} />
            )}
            {ready && kind === 'pdf' && !files.canPreviewPdf && (
              <div className="viewer__placeholder">
                <Icon size={28} />
                <p>{file.name}</p>
                <small>Use “Abrir em nova aba” para ver o PDF ou “Baixar” para salvar no aparelho.</small>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
