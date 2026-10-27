/**
 * Modelo de dados do TravelDesk.
 *
 * Cada viagem é um documento independente que contém todos os seus registros
 * (itinerário, roteiro, checklist e despesas). Esse formato mapeia direto para
 * um documento em bancos como Firestore/Supabase (JSONB) ou pode ser
 * normalizado em tabelas, mantendo o `tripId` como chave estrangeira.
 *
 * Convenções:
 * - Datas: string ISO `YYYY-MM-DD` (sem fuso horário).
 * - Horários: string `HH:mm`.
 * - Timestamps de auditoria: ISO 8601 completo.
 * - Valores monetários: number na unidade da moeda (ex.: 1234.56).
 */

export type ID = string;
export type ISODate = string;
export type TimeHM = string;

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'ARS' | 'CLP' | 'JPY' | 'CAD' | 'AUD' | 'CHF';

export interface Trip {
  id: ID;
  name: string;
  destinations: string[];
  startDate: ISODate;
  endDate: ISODate;
  description: string;
  budget: number | null;
  /** Moeda principal da viagem: usada no orçamento e nos totais. */
  currency: CurrencyCode;
  /** Data URL comprimida ou URL externa. */
  coverImage: string | null;
  itinerary: ItineraryItem[];
  activities: Activity[];
  tasks: ChecklistTask[];
  expenses: Expense[];
  createdAt: string;
  updatedAt: string;
}

/** Campos editáveis no formulário de viagem. */
export type TripDraft = Pick<
  Trip,
  'name' | 'destinations' | 'startDate' | 'endDate' | 'description' | 'budget' | 'currency' | 'coverImage'
>;

// ---------------------------------------------------------------- Itinerário

export type ItineraryType = 'flight' | 'train' | 'bus' | 'car' | 'boat' | 'lodging' | 'other';

export interface ItineraryItem {
  id: ID;
  type: ItineraryType;
  title: string;
  /** Companhia aérea, hotel, empresa de ônibus... */
  provider: string;
  /** Origem (transporte) — para hospedagem fica vazio. */
  origin: string;
  /** Destino (transporte) ou cidade da hospedagem. */
  destination: string;
  startDate: ISODate;
  startTime: TimeHM;
  endDate: ISODate;
  endTime: TimeHM;
  address: string;
  confirmationCode: string;
  link: string;
  notes: string;
}

// ------------------------------------------------------------------- Roteiro

export type ActivityCategory = 'attraction' | 'restaurant' | 'tour' | 'shopping' | 'event' | 'other';

export interface Activity {
  id: ID;
  title: string;
  category: ActivityCategory;
  /** Vazio = ainda sem dia definido. */
  date: ISODate;
  city: string;
  time: TimeHM;
  address: string;
  link: string;
  notes: string;
  done: boolean;
  /** Posição dentro do dia (menor primeiro). */
  order: number;
}

// ----------------------------------------------------------------- Checklist

export interface ChecklistTask {
  id: ID;
  title: string;
  dueDate: ISODate;
  done: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------- Financeiro

export type ExpenseCategory =
  | 'flights'
  | 'lodging'
  | 'transport'
  | 'food'
  | 'tours'
  | 'shopping'
  | 'insurance'
  | 'other';

export type ExpenseStatus = 'paid' | 'pending' | 'installments';

export interface Expense {
  id: ID;
  description: string;
  category: ExpenseCategory;
  /** Valor total da despesa na moeda informada. */
  amount: number;
  currency: CurrencyCode;
  /**
   * Cotação para a moeda principal da viagem (1 unidade desta moeda = X da
   * moeda principal). Obrigatória apenas quando a moeda é diferente.
   */
  exchangeRate: number | null;
  date: ISODate;
  status: ExpenseStatus;
  installments: number;
  paidInstallments: number;
  notes: string;
}
