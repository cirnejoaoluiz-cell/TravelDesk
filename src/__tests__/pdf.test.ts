import { describe, expect, it } from 'vitest';
import { createTrip, emptyActivity, emptyExpense, emptyItineraryItem, emptyTripDraft } from '../domain/factories';
import type { Trip } from '../domain/types';
import { fileSafeName, pdfFileName } from '../features/trip/pdf/exportPdf';
import { buildFinancePdf } from '../features/trip/pdf/financePdf';
import { buildItineraryPdf } from '../features/trip/pdf/itineraryPdf';
import { buildSchedulePdf } from '../features/trip/pdf/schedulePdf';
import { CONTENT_WIDTH } from '../features/trip/pdf/report';

const header = async (blob: Blob) => new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 5));

function sampleTrip(): Trip {
  return {
    ...createTrip({ ...emptyTripDraft(), name: 'Férias na Itália', destinations: ['Roma'], startDate: '2027-01-10', endDate: '2027-01-12', budget: 1000 }),
    itinerary: [{ ...emptyItineraryItem(), title: 'Voo de ida', startDate: '2027-01-10', confirmationCode: 'ABC123' }],
    activities: [{ ...emptyActivity(), title: 'Coliseu', date: '2027-01-11', city: 'Roma' }],
    expenses: [{ ...emptyExpense('BRL'), description: 'Hotel', amount: 600, status: 'installments', installments: 3, paidInstallments: 1 }],
  };
}

describe('exportação em PDF', () => {
  it('gera nomes de arquivo identificáveis e seguros', () => {
    const trip = sampleTrip();
    expect(pdfFileName(trip, 'itinerary')).toBe('Ferias_na_Italia_Itinerario.pdf');
    expect(pdfFileName(trip, 'schedule')).toBe('Ferias_na_Italia_Roteiro.pdf');
    expect(pdfFileName(trip, 'finance')).toBe('Ferias_na_Italia_Financeiro.pdf');
    expect(fileSafeName('  ///  ')).toBe('Viagem');
    expect(fileSafeName('São Paulo → Lisboa / 2027')).toBe('Sao_Paulo_Lisboa_2027');
  });

  it('gera PDFs válidos com e sem registros, sem alterar a viagem', async () => {
    const trip = sampleTrip();
    const snapshot = JSON.stringify(trip);
    const empty = createTrip({ ...emptyTripDraft(), name: '' });
    for (const build of [buildItineraryPdf, buildSchedulePdf, buildFinancePdf]) {
      for (const t of [trip, empty]) {
        const blob = build(t);
        expect(blob.size).toBeGreaterThan(1000);
        expect(await header(blob)).toBe('%PDF-');
      }
    }
    expect(JSON.stringify(trip)).toBe(snapshot);
  });

  it('colunas das tabelas ocupam exatamente a largura útil da página A4', async () => {
    // Garante que nada fique fora das margens se alguém mudar as larguras.
    const sources = await Promise.all([
      import('../features/trip/pdf/itineraryPdf?raw'),
      import('../features/trip/pdf/schedulePdf?raw'),
      import('../features/trip/pdf/financePdf?raw'),
    ]);
    for (const { default: code } of sources) {
      for (const block of code.match(/TableColumn\[\] = \[[\s\S]*?\];/g) ?? []) {
        const total = [...block.matchAll(/width: (\d+(?:\.\d+)?)/g)].reduce((sum, m) => sum + Number(m[1]), 0);
        expect(total).toBe(CONTENT_WIDTH);
      }
    }
  });
});
