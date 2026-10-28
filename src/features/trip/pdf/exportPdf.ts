import type { Trip } from '../../../domain/types';
import { triggerBrowserDownload } from '../../../data/files/FileStore';
import { useCapability } from '../../../platform/claude';

export type PdfSection = 'itinerary' | 'schedule' | 'finance';

const FILE_SUFFIX: Record<PdfSection, string> = {
  itinerary: 'Itinerario',
  schedule: 'Roteiro',
  finance: 'Financeiro',
};

/** "Férias na Itália" → "Ferias_na_Italia" (nome de arquivo seguro em qualquer sistema). */
export function fileSafeName(name: string): string {
  const safe = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return safe || 'Viagem';
}

export function pdfFileName(trip: Trip, section: PdfSection) {
  return `${fileSafeName(trip.name)}_${FILE_SUFFIX[section]}.pdf`;
}

/**
 * Gera o PDF da aba a partir dos dados atuais da viagem (somente leitura) e
 * oferece o download. Tudo acontece no navegador: nenhum dado sai do aparelho.
 * O gerador é carregado sob demanda, só quando alguém exporta.
 */
export async function exportTripPdf(trip: Trip, section: PdfSection): Promise<'saved' | 'declined'> {
  const builders = {
    itinerary: () => import('./itineraryPdf').then((m) => m.buildItineraryPdf),
    schedule: () => import('./schedulePdf').then((m) => m.buildSchedulePdf),
    finance: () => import('./financePdf').then((m) => m.buildFinancePdf),
  };
  const build = await builders[section]();
  const blob = build(trip);
  const filename = pdfFileName(trip, section);

  // No claude.ai o download passa pela confirmação da plataforma.
  const downloads = await useCapability('downloads');
  if (downloads) {
    try {
      await downloads.save({ filename, data: blob });
      return 'saved';
    } catch (error) {
      if ((error as { code?: string })?.code === 'declined') return 'declined';
      throw error;
    }
  }
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, filename);
  // Libera a memória depois que o navegador já começou o download.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'saved';
}
