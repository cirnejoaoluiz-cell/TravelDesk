import { ITINERARY_TYPES } from '../../../domain/catalog';
import type { ItineraryItem, Trip } from '../../../domain/types';
import { formatDate, formatWeekday } from '../../../lib/dates';
import { groupItineraryByDate, itineraryTitle } from '../itinerary/itineraryOps';
import { normalizeUrl } from '../shared';
import { parts, Report, type RichCell, type TableColumn } from './report';

const COLUMNS: TableColumn[] = [
  { header: 'QUANDO', width: 48 },
  { header: 'RESERVA', width: 86 },
  { header: 'LOCALIZADOR', width: 40 },
];

function when(item: ItineraryItem): RichCell {
  const meta = ITINERARY_TYPES[item.type];
  const isLodging = item.type === 'lodging';
  const startLabel = isLodging ? 'Check-in' : meta.isTransport ? 'Partida' : 'Início';
  const endLabel = isLodging ? 'Check-out' : meta.isTransport ? 'Chegada' : 'Fim';
  const moment = (date: string, time: string) => [date && formatDate(date), time].filter(Boolean).join(', ');
  const start = moment(item.startDate, item.startTime);
  const end = moment(item.endDate, item.endTime);
  return {
    rich: parts(
      start ? { text: `${startLabel}: ${start}`, bold: true } : { text: 'Data a definir', tone: 'faint' },
      end && { text: `${endLabel}: ${end}`, tone: 'muted' },
    ),
  };
}

function reservation(item: ItineraryItem): RichCell {
  const meta = ITINERARY_TYPES[item.type];
  const route = meta.isTransport && item.title && (item.origin || item.destination);
  return {
    rich: parts(
      { text: itineraryTitle(item), bold: true },
      { text: [meta.label, item.provider, !meta.isTransport && item.destination].filter(Boolean).join(' · '), tone: 'muted' },
      route && { text: `${item.origin || '—'} → ${item.destination || '—'}` },
      item.address && { text: `Endereço: ${item.address}`, tone: 'muted' },
      item.link && { text: `Link: ${normalizeUrl(item.link)}`, tone: 'accent' },
      item.notes && { text: `Observações: ${item.notes}`, tone: 'muted' },
    ),
  };
}

export function buildItineraryPdf(trip: Trip): Blob {
  const report = new Report(trip, 'Itinerário');
  const groups = groupItineraryByDate(trip.itinerary);

  if (!groups.length) {
    report.empty('Ainda não existem registros cadastrados no itinerário.');
    return report.toBlob();
  }

  const transport = trip.itinerary.filter((i) => ITINERARY_TYPES[i.type].isTransport).length;
  const lodging = trip.itinerary.filter((i) => i.type === 'lodging').length;
  const others = trip.itinerary.length - transport - lodging;
  report.note(
    [
      `${trip.itinerary.length} ${trip.itinerary.length === 1 ? 'registro' : 'registros'} em ordem cronológica`,
      transport && `${transport} ${transport === 1 ? 'deslocamento' : 'deslocamentos'}`,
      lodging && `${lodging} ${lodging === 1 ? 'hospedagem' : 'hospedagens'}`,
      others && `${others} ${others === 1 ? 'outro' : 'outros'}`,
    ]
      .filter(Boolean)
      .join(' · '),
  );

  for (const [date, items] of groups) {
    report.heading(date ? formatWeekday(date) : 'Sem data definida');
    report.table(
      COLUMNS,
      items.map((item) => [
        when(item),
        reservation(item),
        item.confirmationCode ? { rich: [{ text: item.confirmationCode, bold: true }] } : { rich: [{ text: '—', tone: 'faint' }] },
      ]),
    );
  }
  return report.toBlob();
}
