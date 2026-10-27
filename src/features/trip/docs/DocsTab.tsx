import { useMemo, useState } from 'react';
import { Download, Eye, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { Menu } from '../../../components/Menu';
import { useConfirm } from '../../../components/Confirm';
import { useToast } from '../../../components/Toast';
import { DOCUMENT_CATEGORIES } from '../../../domain/catalog';
import type { DocumentCategory, StoredFile, TripDocument } from '../../../domain/types';
import { removeById, upsertById } from '../../../lib/collections';
import { useTrips } from '../../../state/TripsContext';
import { TabHeader } from '../shared';
import type { TabProps } from '../types';
import { DocumentFormModal } from './DocumentFormModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import { FILE_KIND_ICONS, FILE_KIND_LABELS, fileKind, formatBytes } from './fileKind';

type CategoryFilter = 'all' | DocumentCategory;

export function DocsTab({ trip, update }: TabProps) {
  const { files } = useTrips();
  const confirm = useConfirm();
  const toast = useToast();
  const [form, setForm] = useState<{ open: boolean; initial: TripDocument | null }>({ open: false, initial: null });
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<TripDocument | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const usedCategories = useMemo(
    () => (Object.keys(DOCUMENT_CATEGORIES) as DocumentCategory[]).filter((c) => trip.documents.some((d) => d.category === c)),
    [trip.documents],
  );
  const activeFilter = filter !== 'all' && usedCategories.includes(filter) ? filter : 'all';
  const documents = useMemo(
    () =>
      trip.documents
        .filter((d) => activeFilter === 'all' || d.category === activeFilter)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [trip.documents, activeFilter],
  );

  if (!files) return null;
  const canUpload = files.available;

  const save = async (doc: TripDocument, newFile: File | null) => {
    setSaving(true);
    let stored: StoredFile | null = null;
    try {
      if (newFile) stored = await files.save(newFile);
    } catch (error) {
      toast.show((error as Error).message, 'error');
      setSaving(false);
      return;
    }
    const previous = doc.file;
    const next = stored ? { ...doc, file: stored } : doc;
    const ok = await update((t) => ({ ...t, documents: upsertById(t.documents, next) }));
    if (ok) {
      // O arquivo antigo só sai depois que a troca foi salva.
      if (stored && previous) await files.remove(previous).catch(() => undefined);
      setForm({ open: false, initial: null });
      toast.show(form.initial ? 'Documento atualizado' : 'Documento adicionado');
    } else if (stored) {
      // A viagem não foi salva: descarta o arquivo enviado para não deixá-lo órfão.
      await files.remove(stored).catch(() => undefined);
    }
    setSaving(false);
  };

  const remove = async (doc: TripDocument) => {
    const ok = await confirm({
      title: 'Excluir documento?',
      message: `“${doc.name}” e o arquivo anexado serão removidos desta viagem.`,
    });
    if (!ok) return;
    if (await update((t) => ({ ...t, documents: removeById(t.documents, doc.id) }))) {
      if (doc.file) await files.remove(doc.file).catch(() => undefined);
      toast.show('Documento excluído');
    }
  };

  const download = async (doc: TripDocument) => {
    if (!doc.file) return;
    try {
      await files.download(doc.file);
    } catch (error) {
      toast.show((error as Error).message, 'error');
    }
  };

  const addButton = canUpload ? (
    <button className="btn btn--primary" onClick={() => setForm({ open: true, initial: null })}>
      <Plus size={16} /> Adicionar
    </button>
  ) : undefined;

  return (
    <>
      <TabHeader
        title="Docs"
        subtitle="Passagens, reservas, seguro e documentos pessoais desta viagem."
        action={trip.documents.length > 0 && addButton}
      />

      {!canUpload && (
        <p className="notice">Este ambiente não permite guardar arquivos. Abra o TravelDesk pelo site para adicionar documentos.</p>
      )}

      {trip.documents.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={24} />}
          title="Seus documentos de viagem num só lugar"
          text="Guarde cartões de embarque, reservas de hotel, apólice do seguro e ingressos em PDF ou imagem para consultar quando precisar."
          action={addButton}
        />
      ) : (
        <>
          {usedCategories.length > 1 && (
            <div className="chips" aria-label="Filtrar por categoria">
              <button className={`chip ${activeFilter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>
                Todos
              </button>
              {usedCategories.map((c) => (
                <button key={c} className={`chip ${activeFilter === c ? 'is-active' : ''}`} onClick={() => setFilter(c)}>
                  {DOCUMENT_CATEGORIES[c]}
                </button>
              ))}
            </div>
          )}

          <ul className="doc-grid">
            {documents.map((doc) => {
              const kind = fileKind(doc.file);
              const Icon = FILE_KIND_ICONS[kind];
              return (
                <li key={doc.id} className="doc-card">
                  <button type="button" className="doc-card__open" onClick={() => setViewing(doc)} disabled={!doc.file}>
                    <span className={`doc-icon doc-icon--${kind}`}>
                      <Icon size={20} />
                    </span>
                    <span className="doc-card__text">
                      <span className="doc-card__title">{doc.name}</span>
                      <span className="doc-card__meta">
                        {DOCUMENT_CATEGORIES[doc.category]} · {FILE_KIND_LABELS[kind]}
                        {doc.file && <> · {formatBytes(doc.file.size)}</>}
                      </span>
                      {doc.description && <span className="doc-card__desc">{doc.description}</span>}
                    </span>
                  </button>
                  <Menu
                    label={`Ações de ${doc.name}`}
                    actions={[
                      ...(doc.file
                        ? [
                            { label: 'Visualizar', icon: <Eye size={15} />, onSelect: () => setViewing(doc) },
                            { label: 'Baixar', icon: <Download size={15} />, onSelect: () => void download(doc) },
                          ]
                        : []),
                      ...(canUpload
                        ? [{ label: 'Editar', icon: <Pencil size={15} />, onSelect: () => setForm({ open: true, initial: doc }) }]
                        : []),
                      { label: 'Excluir', icon: <Trash2 size={15} />, onSelect: () => void remove(doc), danger: true },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}

      <DocumentFormModal
        open={form.open}
        initial={form.initial}
        busy={saving}
        onClose={() => setForm({ open: false, initial: null })}
        onSubmit={(doc, file) => void save(doc, file)}
      />
      <DocumentViewerModal doc={viewing} files={files} onClose={() => setViewing(null)} onDownload={(d) => void download(d)} />
    </>
  );
}
