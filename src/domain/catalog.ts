import type {
  ActivityCategory,
  CurrencyCode,
  ExpenseCategory,
  ExpenseStatus,
  ItineraryType,
} from './types';

/** Rótulos e listas usados pela interface. Centralizados para facilitar tradução futura. */

export const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: 'BRL', label: 'Real (R$)' },
  { code: 'USD', label: 'Dólar americano (US$)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'Libra (£)' },
  { code: 'ARS', label: 'Peso argentino' },
  { code: 'CLP', label: 'Peso chileno' },
  { code: 'JPY', label: 'Iene (¥)' },
  { code: 'CAD', label: 'Dólar canadense' },
  { code: 'AUD', label: 'Dólar australiano' },
  { code: 'CHF', label: 'Franco suíço' },
];

export const ITINERARY_TYPES: Record<ItineraryType, { label: string; isTransport: boolean }> = {
  flight: { label: 'Voo', isTransport: true },
  train: { label: 'Trem', isTransport: true },
  bus: { label: 'Ônibus', isTransport: true },
  car: { label: 'Carro / transfer', isTransport: true },
  boat: { label: 'Barco / balsa', isTransport: true },
  lodging: { label: 'Hospedagem', isTransport: false },
  other: { label: 'Outro', isTransport: false },
};

export const ACTIVITY_CATEGORIES: Record<ActivityCategory, string> = {
  attraction: 'Atração',
  restaurant: 'Restaurante',
  tour: 'Passeio',
  shopping: 'Compras',
  event: 'Evento',
  other: 'Outro',
};

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  flights: 'Passagens',
  lodging: 'Hospedagem',
  transport: 'Transporte',
  food: 'Alimentação',
  tours: 'Passeios',
  shopping: 'Compras',
  insurance: 'Seguro',
  other: 'Outros',
};

export const EXPENSE_STATUSES: Record<ExpenseStatus, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  installments: 'Parcelado',
};

export const SUGGESTED_TASKS = [
  'Verificar validade do passaporte',
  'Contratar seguro-viagem',
  'Comprar ingressos das atrações',
  'Fazer check-in online',
  'Avisar o banco sobre a viagem',
  'Separar adaptador de tomada',
];
