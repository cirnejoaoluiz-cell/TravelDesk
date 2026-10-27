import { useEffect, useRef, useState } from 'react';
import { Paperclip, RefreshCw } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { Field, Select, TextArea, TextInput } from '../../../components/Field';
import { ACCEPTED_FILE_TYPES, validateFile } from '../../../data/files/FileStore';
import { DOCUMENT_CATEGORIES } from '../../../domain/catalog';
import { emptyDocument } from '../../../domain/factories';
import type { DocumentCategory, TripDocument } from '../../../domain/types';
import { useFormState } from '../../../lib/useFormState';
import { FILE_KIND_ICONS, fileKind, formatBytes, nameFromFile } from './fileKind';

interface Props {
  open: boolean;
  initial: TripDocument | null;
  busy: boolean;
  onClose(): void;
  /** `file` é o novo arquivo escolhido (ou null para manter o atual). */
  onSubmit(doc: TripDocument, file: File | null): void;
}

export function DocumentFormModal({ open, initial, busy, onClose, onSubmit }: Props) {
  const { values, setField, setValues } = useFormState<TripDocument>(emptyDocument());
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValues(initial ?? emptyDocument());
    setFile(null);
    setErrors({});
    // Reinicia o formulário somente ao abrir.
  }, [open]);

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    try {
      validateFile(picked);
    } catch (error) {
      setErrors((e) => ({ ...e, file: (error as Error).message }));
      return;
    }
    setFile(picked);
    setErrors((e) => ({ ...e, file: '' }));
    if (!values.name.trim()) setField('name', nameFromFile(picked.name));
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = 'Dê um nome para o documento.';
    if (!file && !values.file) next.file = 'Escolha um arquivo PDF ou uma imagem.';
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    onSubmit({ ...values, name: values.name.trim(), description: values.description.trim() }, file);
  };

  // O que mostrar no seletor: o arquivo recém-escolhido ou o já salvo.
  const shown = file ? { name: file.name, type: file.type, size: file.size } : values.file;
  const Icon = FILE_KIND_ICONS[fileKind(shown)];

  return (
    <Modal
      open={open}
      title={initial ? 'Editar documento' : 'Novo documento'}
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
    >
      <div className="field">
        <span className="field__label">Arquivo</span>
        {shown ? (
          <div className="file-picked">
            <span className={`doc-icon doc-icon--${fileKind(shown)}`}>
              <Icon size={18} />
            </span>
            <span className="file-picked__info">
              <span className="file-picked__name">{shown.name}</span>
              <span className="file-picked__meta">{formatBytes(shown.size)}</span>
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              <RefreshCw size={14} /> Trocar
            </button>
          </div>
        ) : (
          <button type="button" className="cover-picker__empty file-drop" onClick={() => inputRef.current?.click()}>
            <Paperclip size={20} />
            <span>Escolher arquivo</span>
            <small>PDF ou imagem · até 20 MB</small>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES.join(',')}
          hidden
          aria-label="Arquivo do documento"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {errors.file && <span className="field__error">{errors.file}</span>}
      </div>

      <Field label="Nome" error={errors.name}>
        <TextInput
          value={values.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="Ex.: Cartão de embarque — ida"
        />
      </Field>

      <Field label="Categoria">
        <Select value={values.category} onChange={(e) => setField('category', e.target.value as DocumentCategory)}>
          {Object.entries(DOCUMENT_CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Descrição (opcional)">
        <TextArea
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          rows={2}
          placeholder="Ex.: Apresentar impresso no check-in"
        />
      </Field>
    </Modal>
  );
}
