const nf = (digits: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmt0 = (n: number) => nf(0).format(Math.round(n));
export const fmt1 = (n: number) => nf(1).format(n);
export const fmt2 = (n: number) => nf(2).format(n);

/** Aceita vírgula ou ponto como separador decimal. */
export function parseNum(s: string): number {
  const n = Number(String(s).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
