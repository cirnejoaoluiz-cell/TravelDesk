import { createId } from '../lib/id';
import type {
  Activity,
  ChecklistTask,
  Expense,
  ItineraryItem,
  TripDocument,
  Trip,
  TripDraft,
} from './types';

/** Fábricas e normalizadores: garantem que todo registro tenha todos os campos, inclusive dados antigos. */

export function emptyTripDraft(): TripDraft {
  return {
    name: '',
    destinations: [],
    startDate: '',
    endDate: '',
    description: '',
    budget: null,
    currency: 'BRL',
    coverImage: null,
  };
}

export function createTrip(draft: TripDraft): Trip {
  const now = new Date().toISOString();
  return {
    ...emptyTripDraft(),
    ...draft,
    id: createId(),
    itinerary: [],
    activities: [],
    tasks: [],
    expenses: [],
    documents: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyItineraryItem(): ItineraryItem {
  return {
    id: createId(),
    type: 'flight',
    title: '',
    provider: '',
    origin: '',
    destination: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    address: '',
    confirmationCode: '',
    link: '',
    notes: '',
  };
}

export function emptyActivity(): Activity {
  return {
    id: createId(),
    title: '',
    category: 'attraction',
    date: '',
    city: '',
    time: '',
    address: '',
    link: '',
    notes: '',
    done: false,
    order: Date.now(),
  };
}

export function createTask(title: string, dueDate = ''): ChecklistTask {
  return { id: createId(), title, dueDate, done: false, createdAt: new Date().toISOString() };
}

export function emptyExpense(currency: Expense['currency']): Expense {
  return {
    id: createId(),
    description: '',
    category: 'other',
    amount: 0,
    currency,
    exchangeRate: null,
    date: '',
    city: '',
    status: 'pending',
    installments: 2,
    paidInstallments: 0,
    notes: '',
  };
}

export function emptyDocument(): TripDocument {
  return {
    id: createId(),
    name: '',
    category: 'other',
    description: '',
    file: null,
    createdAt: new Date().toISOString(),
  };
}

type Loose<T> = Partial<T> & Record<string, unknown>;

/** Completa campos ausentes de uma viagem lida do armazenamento (compatibilidade entre versões). */
export function normalizeTrip(raw: Loose<Trip>): Trip {
  const base = createTrip(emptyTripDraft());
  return {
    ...base,
    ...raw,
    id: String(raw.id ?? base.id),
    destinations: Array.isArray(raw.destinations) ? raw.destinations.map(String) : [],
    itinerary: (raw.itinerary ?? []).map((i) => ({ ...emptyItineraryItem(), ...i })),
    activities: (raw.activities ?? []).map((a) => ({ ...emptyActivity(), ...a })),
    tasks: (raw.tasks ?? []).map((t) => ({ ...createTask(''), ...t })),
    expenses: (raw.expenses ?? []).map((e) => ({ ...emptyExpense(raw.currency ?? 'BRL'), ...e })),
    documents: (raw.documents ?? []).map((d) => ({ ...emptyDocument(), ...d })),
  } as Trip;
}

/** Extrai apenas os campos editáveis de uma viagem. */
export function toTripDraft(trip: TripDraft): TripDraft {
  const { name, destinations, startDate, endDate, description, budget, currency, coverImage } = trip;
  return { name, destinations, startDate, endDate, description, budget, currency, coverImage };
}
