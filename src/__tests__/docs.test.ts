import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageTripRepository, STORAGE_KEY } from '../data/LocalStorageTripRepository';
import { downloadName, FileStoreError, validateFile } from '../data/files/FileStore';
import { createTrip, emptyDocument, emptyTripDraft } from '../domain/factories';
import { fileKind, formatBytes, nameFromFile } from '../features/trip/docs/fileKind';

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

describe('aba Docs', () => {
  beforeEach(() => localStorage.clear());

  it('viagens salvas antes da aba Docs continuam abrindo, com lista vazia', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, trips: [{ id: 'antiga', name: 'Antiga', tasks: [{ id: 't', title: 'Passaporte' }] }] }),
    );
    const [trip] = await new LocalStorageTripRepository(localStorage).list();
    expect(trip.documents).toEqual([]);
    expect(trip.tasks[0].title).toBe('Passaporte');
  });

  it('guarda só a referência do arquivo na viagem', async () => {
    const repo = new LocalStorageTripRepository(localStorage);
    const trip = createTrip({ ...emptyTripDraft(), name: 'Roma' });
    const doc = { ...emptyDocument(), name: 'Seguro', category: 'insurance' as const, file: { id: 'f1', name: 'apolice.pdf', type: 'application/pdf', size: 2_000_000 } };
    await repo.save({ ...trip, documents: [doc] });
    const [loaded] = await repo.list();
    expect(loaded.documents[0]).toMatchObject({ name: 'Seguro', category: 'insurance', file: { id: 'f1' } });
    expect(localStorage.getItem(STORAGE_KEY)!.length).toBeLessThan(5_000);
  });

  it('aceita PDF e imagens até 20 MB', () => {
    expect(() => validateFile(file('a.pdf', 'application/pdf'))).not.toThrow();
    expect(() => validateFile(file('a.jpg', 'image/jpeg'))).not.toThrow();
    expect(() => validateFile(file('a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toThrow(FileStoreError);
    expect(() => validateFile(file('a.pdf', 'application/pdf', 0))).toThrow(FileStoreError);
    const big = { name: 'a.pdf', type: 'application/pdf', size: 21 * 1024 * 1024 } as File;
    expect(() => validateFile(big)).toThrow(/20 MB/);
  });

  it('identifica o tipo, formata tamanhos e sugere nomes', () => {
    expect(fileKind({ type: 'application/pdf' })).toBe('pdf');
    expect(fileKind({ type: 'image/png' })).toBe('image');
    expect(fileKind(null)).toBe('none');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2_500)).toBe('2 KB');
    expect(formatBytes(1_572_864)).toBe('1,5 MB');
    expect(nameFromFile('cartao_embarque.pdf')).toBe('cartao embarque');
  });

  it('garante a extensão no nome do download', () => {
    expect(downloadName({ id: '1', name: 'apolice', type: 'application/pdf', size: 1 })).toBe('apolice.pdf');
    expect(downloadName({ id: '1', name: 'foto.JPEG', type: 'image/jpeg', size: 1 })).toBe('foto.JPEG');
  });
});
