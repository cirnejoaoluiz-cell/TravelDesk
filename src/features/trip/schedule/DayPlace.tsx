import { useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, MapPin } from 'lucide-react';
import { CitySelect } from '../../../components/CitySelect';
import { sameCity, type DayPlan, type Movement } from '../../../domain/dayPlan';
import { formatDate } from '../../../lib/dates';

interface Props {
  plan: DayPlan;
  /** Cidades da viagem (opções do menu). */
  cities: string[];
  /** '' remove a escolha manual e volta para a cidade do Itinerário. */
  onChangeCity(city: string): void;
}

const arrivalText = (m: Movement) =>
  `Chegada a ${m.to}${m.arriveTime ? ` às ${m.arriveTime}` : ' (horário não informado)'} · ${m.mode}${m.from ? ` de ${m.from}` : ''}`;

const departureText = (m: Movement, date: string) => {
  const later = m.arriveDate !== date;
  const arrival = later ? ` (chega em ${formatDate(m.arriveDate, false)}${m.arriveTime ? `, ${m.arriveTime}` : ''})` : '';
  return `Saída${m.from ? ` de ${m.from}` : ''}${m.departTime ? ` às ${m.departTime}` : ''} · ${m.mode} para ${m.to}${arrival}`;
};

/** Cidade do dia (calculada pelo Itinerário ou escolhida pela pessoa) e deslocamentos do dia. */
export function DayPlace({ plan, cities, onChangeCity }: Props) {
  const [editing, setEditing] = useState(false);
  // Chegada à cidade em uso no dia (a última, se houver mais de uma).
  const mainArrival = [...plan.arrivals].reverse().find((a) => sameCity(a.to, plan.derivedCity));
  const showArrivalInTitle = mainArrival && !plan.manualCity;
  const otherMoves = [
    ...plan.departures.map((m) => ({ key: `d-${m.itemId}`, kind: 'departure' as const, text: departureText(m, plan.date), sort: m.departTime || '99:99' })),
    ...plan.arrivals
      .filter((m) => !(showArrivalInTitle && m === mainArrival))
      .map((m) => ({ key: `a-${m.itemId}`, kind: 'arrival' as const, text: arrivalText(m), sort: m.arriveTime || '99:99' })),
  ].sort((a, b) => a.sort.localeCompare(b.sort));

  return (
    <div className="day-place">
      <div className="day-place__line">
        <MapPin size={14} />
        {plan.city ? (
          <span className="day-place__city">
            {plan.city}
            {showArrivalInTitle && mainArrival.arriveTime && <span className="day-place__arrival"> — chegada às {mainArrival.arriveTime}</span>}
          </span>
        ) : (
          <span className="day-place__city day-place__city--unknown">Cidade não identificada</span>
        )}
        <span className="day-place__source">
          {plan.manualCity ? 'definida por você' : plan.city ? 'pelo Itinerário' : ''}
        </span>
        {!editing && (
          <button type="button" className="day-place__edit" onClick={() => setEditing(true)}>
            {plan.city ? 'Alterar' : 'Definir cidade'}
          </button>
        )}
      </div>

      {editing && (
        <div className="day-place__picker">
          <CitySelect
            cities={cities}
            value={plan.manualCity ?? ''}
            aria-label="Cidade do dia"
            emptyLabel={plan.derivedCity ? `Usar a do Itinerário (${plan.derivedCity})` : 'Cidade não identificada'}
            onChange={(v) => {
              onChangeCity(v);
              setEditing(false);
            }}
          />
          <button type="button" className="link-btn" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </div>
      )}

      {plan.conflict && (
        <p className="day-place__conflict">
          <AlertTriangle size={13} /> O Itinerário indica {plan.derivedCity} para este dia.
          <button type="button" className="day-place__edit" onClick={() => onChangeCity('')}>
            Usar {plan.derivedCity}
          </button>
        </p>
      )}

      {otherMoves.length > 0 && (
        <ul className="day-place__moves">
          {otherMoves.map((m) => (
            <li key={m.key}>
              {m.kind === 'arrival' ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />} {m.text}
            </li>
          ))}
        </ul>
      )}

      {plan.arrivals.some((a) => a.arriveTime) && (
        <p className="day-place__hint">Reserve tempo para desembarque, bagagem e check-in antes das atividades.</p>
      )}
    </div>
  );
}
