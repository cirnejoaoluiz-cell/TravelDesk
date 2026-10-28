import { describe, expect, it } from 'vitest';
import { activityWarnings, arrivalDate, planDays } from '../domain/dayPlan';
import { emptyActivity, emptyItineraryItem } from '../domain/factories';
import type { ItineraryItem } from '../domain/types';
import { eachDay } from '../lib/dates';

const move = (patch: Partial<ItineraryItem>): ItineraryItem => ({ ...emptyItineraryItem(), type: 'flight', ...patch });
const destinations = ['Natal', 'Lisboa', 'Viena', 'Budapeste'];

// Exemplo do pedido: 18/06 Natal → Lisboa 18:00 (chega 06:00 do dia 19), 21/06 Lisboa → Viena, 23/06 Viena → Budapeste.
const itinerary = [
  move({ id: 'a', origin: 'Natal', destination: 'Lisboa', startDate: '2027-06-18', startTime: '18:00', endDate: '2027-06-19', endTime: '06:00' }),
  move({ id: 'b', type: 'train', origin: 'Lisboa', destination: 'Viena', startDate: '2027-06-21', startTime: '08:00', endTime: '11:30' }),
  move({ id: 'c', type: 'bus', origin: 'Viena', destination: 'Budapeste', startDate: '2027-06-23', startTime: '14:00', endTime: '17:00' }),
];
const days = eachDay('2027-06-18', '2027-06-25');

describe('plano do dia a partir do Itinerário', () => {
  const plans = planDays({ itinerary, destinations }, days);
  const p = (d: string) => plans.get(`2027-06-${d}`)!;

  it('viagem noturna: partida no dia 18 (Natal) e chegada no dia 19 às 06:00 (Lisboa)', () => {
    expect(p('18')).toMatchObject({ city: 'Natal', derivedSource: 'before-departure', arrivals: [] });
    expect(p('18').departures.map((d) => d.to)).toEqual(['Lisboa']);
    expect(p('19')).toMatchObject({ city: 'Lisboa', derivedSource: 'arrival', startCity: 'Natal' });
    expect(p('19').arrivals[0]).toMatchObject({ to: 'Lisboa', arriveTime: '06:00' });
  });

  it('dia inteiro sem deslocamentos mantém a última cidade', () => {
    expect(p('20')).toMatchObject({ city: 'Lisboa', derivedSource: 'stay', arrivals: [], departures: [] });
    expect(p('22')).toMatchObject({ city: 'Viena', derivedSource: 'stay' });
    expect(p('25')).toMatchObject({ city: 'Budapeste', derivedSource: 'stay' });
  });

  it('chegada no mesmo dia da partida, com horário cadastrado', () => {
    expect(p('21')).toMatchObject({ city: 'Viena', startCity: 'Lisboa', derivedSource: 'arrival' });
    expect(p('21').arrivals[0]).toMatchObject({ to: 'Viena', arriveTime: '11:30', from: 'Lisboa' });
    expect(p('23').arrivals[0]).toMatchObject({ to: 'Budapeste', arriveTime: '17:00' });
  });

  it('chegada após a meia-noite sem data de chegada vai para o dia seguinte', () => {
    expect(arrivalDate({ startDate: '2027-06-18', startTime: '23:10', endDate: '', endTime: '01:40' })).toBe('2027-06-19');
    expect(arrivalDate({ startDate: '2027-06-18', startTime: '08:00', endDate: '', endTime: '11:00' })).toBe('2027-06-18');
    expect(arrivalDate({ startDate: '2027-06-18', startTime: '', endDate: '', endTime: '' })).toBe('2027-06-18');
  });

  it('sem horário de chegada cadastrado, nenhum horário é estimado', () => {
    const plans2 = planDays({ itinerary: [move({ origin: 'Lisboa', destination: 'Viena', startDate: '2027-06-21' })], destinations }, ['2027-06-21']);
    expect(plans2.get('2027-06-21')!.arrivals[0].arriveTime).toBe('');
    expect(plans2.get('2027-06-21')!.city).toBe('Viena');
  });

  it('várias chegadas no mesmo dia: todas consideradas, cidade final = última chegada', () => {
    const plans2 = planDays(
      {
        itinerary: [
          move({ origin: 'Lisboa', destination: 'Viena', startDate: '2027-06-21', startTime: '07:00', endTime: '10:00' }),
          move({ type: 'train', origin: 'Viena', destination: 'Budapeste', startDate: '2027-06-21', startTime: '15:00', endTime: '17:40' }),
        ],
        destinations,
      },
      ['2027-06-21'],
    );
    const plan = plans2.get('2027-06-21')!;
    expect(plan.arrivals.map((a) => `${a.to} ${a.arriveTime}`)).toEqual(['Viena 10:00', 'Budapeste 17:40']);
    expect(plan.city).toBe('Budapeste');
  });

  it('dias sem informação ficam como não identificados; hospedagem também indica a cidade', () => {
    const none = planDays({ itinerary: [], destinations }, ['2027-06-20']).get('2027-06-20')!;
    expect(none.city).toBeNull();
    const lodging = planDays(
      { itinerary: [{ ...emptyItineraryItem(), type: 'lodging', destination: 'Viena', startDate: '2027-06-20', endDate: '2027-06-23' }], destinations },
      ['2027-06-19', '2027-06-21'],
    );
    expect(lodging.get('2027-06-19')!.city).toBeNull();
    expect(lodging.get('2027-06-21')!.city).toBe('Viena');
  });

  it('alterar o Itinerário atualiza o plano (nada fica salvo em duplicidade)', () => {
    const changed = itinerary.map((i) => (i.id === 'b' ? { ...i, startDate: '2027-06-22', endTime: '13:15' } : i));
    const plans2 = planDays({ itinerary: changed, destinations }, days);
    expect(plans2.get('2027-06-21')!.city).toBe('Lisboa');
    expect(plans2.get('2027-06-22')!.arrivals[0].arriveTime).toBe('13:15');
  });

  it('cidade manual prevalece e o conflito com o Itinerário é sinalizado', () => {
    const plans2 = planDays({ itinerary, destinations, dayCities: { '2027-06-20': 'Viena', '2027-06-22': 'viena' } }, days);
    expect(plans2.get('2027-06-20')).toMatchObject({ city: 'Viena', derivedCity: 'Lisboa', conflict: true });
    expect(plans2.get('2027-06-22')).toMatchObject({ conflict: false });
  });

  it('sinaliza (sem bloquear) atividades incompatíveis com chegada, partida ou cidade', () => {
    const act = (time: string, city = '') => ({ ...emptyActivity(), time, city });
    expect(activityWarnings(act('09:00', 'Viena'), p('21'))).toEqual(['Antes da chegada a Viena (11:30)']);
    expect(activityWarnings(act('14:00', 'Viena'), p('21'))).toEqual([]);
    expect(activityWarnings(act('10:00', 'Lisboa'), p('21'))).toEqual(['Depois da saída de Lisboa (08:00)']);
    expect(activityWarnings(act('07:00', 'Lisboa'), p('21'))).toEqual([]);
    expect(activityWarnings(act('', 'Budapeste'), p('20'))).toEqual(['Fora da cidade prevista para o dia (Lisboa)']);
    expect(activityWarnings(act('08:00'), p('19'))).toEqual([]);
  });
});
