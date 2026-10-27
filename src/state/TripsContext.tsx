import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getTripRepository, type FileStore, type StorageKind, type TripRepository } from '../data';
import { createTrip } from '../domain/factories';
import type { ID, Trip, TripDraft } from '../domain/types';
import { useToast } from '../components/Toast';

interface TripsContextValue {
  trips: Trip[];
  loading: boolean;
  /** Onde os dados estão sendo guardados (conta no claude.ai ou navegador). */
  storage: StorageKind | null;
  /** Armazenamento dos anexos da aba Docs (null enquanto carrega). */
  files: FileStore | null;
  addTrip(draft: TripDraft): Promise<Trip | null>;
  /** Aplica uma alteração imutável na viagem e persiste. */
  updateTrip(id: ID, updater: (trip: Trip) => Trip): Promise<boolean>;
  deleteTrip(id: ID): Promise<void>;
  replaceAll(trips: Trip[]): Promise<void>;
}

const TripsContext = createContext<TripsContextValue | null>(null);

export function TripsProvider({ children }: { children: ReactNode }) {
  const [repository, setRepository] = useState<TripRepository | null>(null);
  const [storage, setStorage] = useState<StorageKind | null>(null);
  const [files, setFiles] = useState<FileStore | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const tripsRef = useRef<Trip[]>([]);
  const toast = useToast();

  const commit = useCallback((next: Trip[]) => {
    tripsRef.current = next;
    setTrips(next);
  }, []);

  useEffect(() => {
    void getTripRepository().then(({ repository, files, kind }) => {
      setRepository(repository);
      setFiles(files);
      setStorage(kind);
    });
  }, []);

  const reload = useCallback(async () => {
    if (!repository) return;
    try {
      commit(await repository.list());
    } catch (error) {
      reportErrorRef.current(error);
    } finally {
      setLoading(false);
    }
  }, [commit, repository]);

  useEffect(() => {
    void reload();
    // Busca alterações feitas em outra aba ou em outro dispositivo ao voltar para a página.
    const onStorage = () => void reload();
    const onVisible = () => document.visibilityState === 'visible' && void reload();
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload]);

  const reportError = useCallback(
    (error: unknown) => {
      console.error(error);
      toast.show(error instanceof Error ? error.message : 'Não foi possível salvar.', 'error');
    },
    [toast],
  );
  const reportErrorRef = useRef(reportError);
  reportErrorRef.current = reportError;

  const addTrip = useCallback<TripsContextValue['addTrip']>(
    async (draft) => {
      if (!repository) return null;
      try {
        const saved = await repository.save(createTrip(draft));
        commit([...tripsRef.current, saved]);
        return saved;
      } catch (error) {
        reportError(error);
        return null;
      }
    },
    [commit, reportError, repository],
  );

  const updateTrip = useCallback<TripsContextValue['updateTrip']>(
    async (id, updater) => {
      if (!repository) return false;
      const previous = tripsRef.current;
      const current = previous.find((t) => t.id === id);
      if (!current) return false;
      const next = updater(current);
      // Atualização otimista: a tela responde na hora; desfaz se a gravação falhar.
      commit(previous.map((t) => (t.id === id ? next : t)));
      try {
        const saved = await repository.save(next);
        commit(tripsRef.current.map((t) => (t.id === id ? saved : t)));
        return true;
      } catch (error) {
        commit(previous);
        reportError(error);
        return false;
      }
    },
    [commit, reportError, repository],
  );

  const deleteTrip = useCallback<TripsContextValue['deleteTrip']>(
    async (id) => {
      if (!repository) return;
      const documents = tripsRef.current.find((t) => t.id === id)?.documents ?? [];
      try {
        await repository.remove(id);
        commit(tripsRef.current.filter((t) => t.id !== id));
      } catch (error) {
        reportError(error);
        return;
      }
      // Remove também os anexos da aba Docs, para não ocupar espaço à toa.
      for (const doc of documents) if (doc.file) await files?.remove(doc.file).catch(() => undefined);
    },
    [commit, files, reportError, repository],
  );

  const replaceAll = useCallback<TripsContextValue['replaceAll']>(
    async (next) => {
      if (!repository) return;
      const keep = new Set(next.flatMap((t) => t.documents ?? []).map((d) => d.file?.id));
      const dropped = tripsRef.current.flatMap((t) => t.documents).filter((d) => d.file && !keep.has(d.file.id));
      await repository.replaceAll(next);
      await reload();
      // Arquivos de documentos que não existem mais no backup restaurado.
      for (const doc of dropped) if (doc.file) await files?.remove(doc.file).catch(() => undefined);
    },
    [files, reload, repository],
  );

  const value = useMemo(
    () => ({ trips, loading, storage, files, addTrip, updateTrip, deleteTrip, replaceAll }),
    [trips, loading, storage, files, addTrip, updateTrip, deleteTrip, replaceAll],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips() {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips precisa estar dentro de <TripsProvider>');
  return ctx;
}

/** Acesso a uma viagem específica + atalho de atualização. */
export function useTrip(id: ID | undefined) {
  const { trips, loading, updateTrip } = useTrips();
  const trip = trips.find((t) => t.id === id) ?? null;
  const update = useCallback((updater: (trip: Trip) => Trip) => updateTrip(id ?? '', updater), [id, updateTrip]);
  return { trip, loading, update };
}
