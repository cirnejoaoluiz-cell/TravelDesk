import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { tripRepository, type TripRepository } from '../data';
import { createTrip } from '../domain/factories';
import type { ID, Trip, TripDraft } from '../domain/types';
import { useToast } from '../components/Toast';

interface TripsContextValue {
  trips: Trip[];
  loading: boolean;
  addTrip(draft: TripDraft): Promise<Trip | null>;
  /** Aplica uma alteração imutável na viagem e persiste. */
  updateTrip(id: ID, updater: (trip: Trip) => Trip): Promise<boolean>;
  deleteTrip(id: ID): Promise<void>;
  replaceAll(trips: Trip[]): Promise<void>;
}

const TripsContext = createContext<TripsContextValue | null>(null);

export function TripsProvider({
  children,
  repository = tripRepository,
}: {
  children: ReactNode;
  repository?: TripRepository;
}) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const tripsRef = useRef<Trip[]>([]);
  const toast = useToast();

  const commit = useCallback((next: Trip[]) => {
    tripsRef.current = next;
    setTrips(next);
  }, []);

  const reload = useCallback(async () => {
    commit(await repository.list());
    setLoading(false);
  }, [commit, repository]);

  useEffect(() => {
    void reload();
    // Mantém abas do navegador sincronizadas quando os dados mudam em outra aba.
    const onStorage = () => void reload();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reload]);

  const reportError = useCallback(
    (error: unknown) => {
      console.error(error);
      toast.show(error instanceof Error ? error.message : 'Não foi possível salvar.', 'error');
    },
    [toast],
  );

  const addTrip = useCallback<TripsContextValue['addTrip']>(
    async (draft) => {
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
      try {
        await repository.remove(id);
        commit(tripsRef.current.filter((t) => t.id !== id));
      } catch (error) {
        reportError(error);
      }
    },
    [commit, reportError, repository],
  );

  const replaceAll = useCallback<TripsContextValue['replaceAll']>(
    async (next) => {
      await repository.replaceAll(next);
      await reload();
    },
    [reload, repository],
  );

  const value = useMemo(
    () => ({ trips, loading, addTrip, updateTrip, deleteTrip, replaceAll }),
    [trips, loading, addTrip, updateTrip, deleteTrip, replaceAll],
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
