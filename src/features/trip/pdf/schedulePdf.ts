import { ACTIVITY_CATEGORIES } from '../../../domain/catalog';
import type { Activity, Trip } from '../../../domain/types';
import { eachDay, formatWeekday } from '../../../lib/dates';
import { groupActivitiesByDay } from '../schedule/scheduleOps';
import { planDays, sameCity, type DayPlan } from '../../../domain/dayPlan';
import { normalizeUrl } from '../shared';
import { parts, Report, type RichCell, type TableColumn } from './report';

const COLUMNS: TableColumn[] = [
  { header: 'HORÁRIO', width: 22 },
  { header: 'ATIVIDADE', width: 72 },
  { header: 'DETALHES', width: 80 },
];

function activityCell(a: Activity): RichCell {
  return {
    rich: parts(
      { text: a.title, bold: true },
      { text: [ACTIVITY_CATEGORIES[a.category], a.city].filter(Boolean).join(' · '), tone: 'muted' },
      a.done && { text: 'Concluída', tone: 'accent' },
    ),
  };
}

function detailsCell(a: Activity): RichCell {
  return {
    rich: parts(
      a.address && { text: `Endereço: ${a.address}` },
      a.link && { text: `Link: ${normalizeUrl(a.link)}`, tone: 'accent' },
      a.notes && { text: `Observações: ${a.notes}`, tone: 'muted' },
    ),
  };
}

/** "Viena — chegada às 11:30 · saída de Lisboa às 08:00" (calculado do Itinerário). */
function placeLine(plan: DayPlan | undefined, activityCities: string[]): string | undefined {
  const parts: string[] = [];
  if (plan?.city) {
    const arrival = [...plan.arrivals].reverse().find((a) => sameCity(a.to, plan.city) && a.arriveTime);
    parts.push(`${plan.city}${arrival ? ` — chegada às ${arrival.arriveTime}` : ''}`);
    for (const d of plan.departures) if (d.from && d.departTime) parts.push(`saída de ${d.from} às ${d.departTime}`);
  }
  const extra = activityCities.filter((c) => !sameCity(c, plan?.city));
  if (extra.length) parts.push(extra.join(' · '));
  return parts.length ? parts.join(' · ') : undefined;
}

export function buildSchedulePdf(trip: Trip): Blob {
  const report = new Report(trip, 'Roteiro');

  if (!trip.activities.length) {
    report.empty('Ainda não existem atividades cadastradas no roteiro.');
    return report.toBlob();
  }

  const tripDays = eachDay(trip.startDate, trip.endDate);
  // Mesma organização da aba (sem filtro): dias da viagem + dias avulsos + "sem dia definido".
  const days = groupActivitiesByDay(trip.activities, tripDays, true);
  const plans = planDays(trip, days.map((d) => d.date).filter(Boolean));
  const done = trip.activities.filter((a) => a.done).length;
  report.note(
    `${trip.activities.length} ${trip.activities.length === 1 ? 'atividade' : 'atividades'} · ${done} ${done === 1 ? 'concluída' : 'concluídas'} · na ordem definida em cada dia`,
  );

  for (const { date, items } of days) {
    const dayNumber = tripDays.indexOf(date) + 1;
    const title = date
      ? `${dayNumber ? `Dia ${dayNumber} · ` : ''}${formatWeekday(date)}${dayNumber ? '' : ' (fora do período)'}`
      : 'Sem dia definido';
    const cities = [...new Set(items.map((a) => a.city).filter(Boolean))];
    report.heading(title, placeLine(plans.get(date), cities));
    if (!items.length) {
      report.note('Dia livre — nenhuma atividade planejada.', 'faint');
      continue;
    }
    report.table(
      COLUMNS,
      items.map((a) => [
        a.time ? { rich: [{ text: a.time, bold: true }] } : { rich: [{ text: '—', tone: 'faint' }] },
        activityCell(a),
        detailsCell(a),
      ]),
    );
  }
  return report.toBlob();
}
