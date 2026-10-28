import { useMemo, useState } from 'react';
import { ArrowDownUp, ChevronDown, ChevronUp, Clock, Map as MapIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { Menu } from '../../../components/Menu';
import { useConfirm } from '../../../components/Confirm';
import { ACTIVITY_CATEGORIES } from '../../../domain/catalog';
import type { Activity } from '../../../domain/types';
import { removeById } from '../../../lib/collections';
import { eachDay, formatWeekday } from '../../../lib/dates';
import { ACTIVITY_ICONS } from '../icons';
import { AddressLink, ExternalAnchor, TabHeader } from '../shared';
import type { TabProps } from '../types';
import { ActivityFormModal } from './ActivityFormModal';
import { ExportPdfButton } from '../pdf/ExportPdfButton';
import { groupActivitiesByDay, moveActivity, saveActivity, sortDayByTime } from './scheduleOps';

export function ScheduleTab({ trip, update }: TabProps) {
  const [cityFilter, setCityFilter] = useState('');
  const [form, setForm] = useState<{ open: boolean; initial: Activity | null; defaults: Partial<Activity> }>({
    open: false,
    initial: null,
    defaults: {},
  });
  const confirm = useConfirm();

  const tripDays = useMemo(() => eachDay(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    trip.activities.forEach((a) => a.city && set.add(a.city));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [trip.activities]);

  const citySuggestions = useMemo(
    () => [...new Set([...trip.destinations, ...cities])],
    [trip.destinations, cities],
  );

  const visible = useMemo(
    () => (cityFilter ? trip.activities.filter((a) => a.city === cityFilter) : trip.activities),
    [trip.activities, cityFilter],
  );
  const visibleIds = useMemo(() => new Set(visible.map((a) => a.id)), [visible]);

  const days = useMemo(() => groupActivitiesByDay(visible, tripDays, !cityFilter), [visible, tripDays, cityFilter]);

  const done = trip.activities.filter((a) => a.done).length;

  const openNew = (date = '') =>
    setForm({ open: true, initial: null, defaults: { date, city: cityFilter || trip.destinations[0] || '' } });

  const setActivities = (fn: (list: Activity[]) => Activity[]) =>
    update((t) => ({ ...t, activities: fn(t.activities) }));

  const save = async (activity: Activity) => {
    if (await setActivities((list) => saveActivity(list, activity))) setForm((f) => ({ ...f, open: false }));
  };

  const remove = async (activity: Activity) => {
    if (await confirm({ title: 'Excluir atividade?', message: `“${activity.title}” será removida do roteiro.` })) {
      await setActivities((list) => removeById(list, activity.id));
    }
  };

  const addButton = (
    <button className="btn btn--primary" onClick={() => openNew(tripDays[0] ?? '')}>
      <Plus size={16} /> Adicionar
    </button>
  );

  const hasContent = trip.activities.length > 0 || tripDays.length > 0;

  return (
    <>
      <TabHeader
        title="Roteiro"
        subtitle={
          trip.activities.length
            ? `${done} de ${trip.activities.length} atividades concluídas`
            : 'O que fazer em cada dia e em cada cidade.'
        }
        action={hasContent && addButton}
      />

      {cities.length > 1 && (
        <div className="chips" role="tablist" aria-label="Filtrar por cidade">
          <button className={`chip ${!cityFilter ? 'is-active' : ''}`} onClick={() => setCityFilter('')}>
            Todas as cidades
          </button>
          {cities.map((city) => (
            <button key={city} className={`chip ${cityFilter === city ? 'is-active' : ''}`} onClick={() => setCityFilter(city)}>
              {city}
            </button>
          ))}
        </div>
      )}

      {!hasContent ? (
        <EmptyState
          icon={<MapIcon size={24} />}
          title="Monte seu roteiro"
          text="Adicione atrações, restaurantes e passeios. Dica: defina as datas da viagem para ver os dias organizados automaticamente."
          action={addButton}
        />
      ) : (
        <div className="days">
          {days.map(({ date, items }) => {
            const dayNumber = tripDays.indexOf(date) + 1;
            const dayCities = [...new Set(items.map((a) => a.city).filter(Boolean))];
            return (
              <section key={date || 'sem-data'} className="day">
                <header className="day__header">
                  <div>
                    <p className="day__eyebrow">{date ? (dayNumber ? `Dia ${dayNumber}` : 'Fora do período') : 'A organizar'}</p>
                    <h3 className="day__title">{date ? formatWeekday(date) : 'Sem dia definido'}</h3>
                  </div>
                  <div className="day__tools">
                    {dayCities.map((c) => (
                      <span key={c} className="pill">
                        {c}
                      </span>
                    ))}
                    {items.length > 1 && date && (
                      <button
                        className="icon-btn"
                        title="Ordenar por horário"
                        aria-label="Ordenar por horário"
                        onClick={() => void setActivities((list) => sortDayByTime(list, date))}
                      >
                        <ArrowDownUp size={16} />
                      </button>
                    )}
                    <button className="icon-btn" aria-label="Adicionar atividade neste dia" title="Adicionar neste dia" onClick={() => openNew(date)}>
                      <Plus size={17} />
                    </button>
                  </div>
                </header>

                {items.length === 0 ? (
                  <button className="day__empty" onClick={() => openNew(date)}>
                    Dia livre — adicionar atividade
                  </button>
                ) : (
                  <ul className="activity-list">
                    {items.map((activity, index) => (
                      <ActivityRow
                        key={activity.id}
                        activity={activity}
                        isFirst={index === 0}
                        isLast={index === items.length - 1}
                        onToggle={() =>
                          void setActivities((list) =>
                            list.map((a) => (a.id === activity.id ? { ...a, done: !a.done } : a)),
                          )
                        }
                        onMove={(dir) => void setActivities((list) => moveActivity(list, activity.id, dir, visibleIds))}
                        onEdit={() => setForm({ open: true, initial: activity, defaults: {} })}
                        onDelete={() => void remove(activity)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <ExportPdfButton trip={trip} section="schedule" />

      <ActivityFormModal
        open={form.open}
        initial={form.initial}
        defaults={form.defaults}
        days={tripDays}
        cities={citySuggestions}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSubmit={(a) => void save(a)}
      />
    </>
  );
}

interface RowProps {
  activity: Activity;
  isFirst: boolean;
  isLast: boolean;
  onToggle(): void;
  onMove(direction: -1 | 1): void;
  onEdit(): void;
  onDelete(): void;
}

function ActivityRow({ activity, isFirst, isLast, onToggle, onMove, onEdit, onDelete }: RowProps) {
  const Icon = ACTIVITY_ICONS[activity.category];
  return (
    <li className={`activity ${activity.done ? 'is-done' : ''}`}>
      <input
        type="checkbox"
        className="checkbox"
        checked={activity.done}
        onChange={onToggle}
        aria-label={`Marcar “${activity.title}” como concluída`}
      />
      <div className="activity__main">
        <div className="activity__line">
          {activity.time && (
            <span className="activity__time">
              <Clock size={12} /> {activity.time}
            </span>
          )}
          <h4 className="activity__title">{activity.title}</h4>
        </div>
        <p className="activity__meta">
          <Icon size={13} /> {ACTIVITY_CATEGORIES[activity.category]}
          {activity.city && <> · {activity.city}</>}
        </p>
        {(activity.address || activity.link) && (
          <div className="item-card__details">
            <AddressLink address={activity.address} />
            <ExternalAnchor href={activity.link} />
          </div>
        )}
        {activity.notes && <p className="item-card__notes">{activity.notes}</p>}
      </div>
      <div className="activity__actions">
        <div className="reorder">
          <button className="icon-btn icon-btn--sm" disabled={isFirst} onClick={() => onMove(-1)} aria-label="Mover para cima">
            <ChevronUp size={15} />
          </button>
          <button className="icon-btn icon-btn--sm" disabled={isLast} onClick={() => onMove(1)} aria-label="Mover para baixo">
            <ChevronDown size={15} />
          </button>
        </div>
        <Menu
          actions={[
            { label: 'Editar', icon: <Pencil size={15} />, onSelect: onEdit },
            { label: 'Excluir', icon: <Trash2 size={15} />, onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    </li>
  );
}
