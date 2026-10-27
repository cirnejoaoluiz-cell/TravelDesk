import type { CurrencyCode } from '../domain/types';

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(value: number, currency: CurrencyCode): string {
  let fmt = formatters.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency });
    formatters.set(currency, fmt);
  }
  return fmt.format(Number.isFinite(value) ? value : 0);
}

/** Aceita "1.234,56", "1234.56" ou "1234,5" e devolve número (ou null se vazio/inválido). */
export function parseMoneyInput(raw: string): number | null {
  const text = raw.trim().replace(/\s|R\$|\$|€|£/g, '');
  if (!text) return null;
  let normalized = text;
  if (text.includes(',')) {
    normalized = text.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    // "1.500" ou "12.000.000": pontos como separador de milhar.
    normalized = text.replace(/\./g, '');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Converte número para texto de input no padrão brasileiro. */
export function toMoneyInput(value: number | null | undefined, maxDecimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals });
}
