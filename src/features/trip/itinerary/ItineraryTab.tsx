import { useMemo, useState } from 'react';
import { ArrowRight, Pencil, Plus, Route, Trash2 } from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { Menu } from '../../../components/Menu';
import { useConfirm } from '../../../components/Confirm';
import { ITINERARY_TYPES } from '../../../domain/catalog';
import type { ItineraryItem } from '../../../domain/types';
import { removeById, upsertById } from '../../../lib/collections';
import { formatDate, formatWeekday } from '../../../lib/dates';
import { ITINERARY_ICONS } from '../icons';
import { AddressLink, CopyCode, ExternalAnchor, TabHeader } from '../shared';
import type { TabProps } from '../types';
import { ItineraryFormModal } from './ItineraryFormModal';
import { ExportPdfButton } from '../pdf/ExportPdfButton';
import { groupItineraryByDate, itineraryTitle } from './itineraryOps';
import { tripCities } from '../../../domain/destinations';

export function ItineraryTab({ trip, update }: TabProps) {
  const [editing, setEditing] = useState<ItineraryItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const confirm = useConfirm();

  const groups = useMemo(() => groupItineraryByDate(trip.itinerary), [trip.itinerary]);

  const openForm = (item: ItineraryItem | null) => {
    setEditing(item);
    setFormOpen(true);
  };

  const save = async (item: ItineraryItem) => {
    if (await update((t) => ({ ...t, itinerary: upsertById(t.itinerary, item) }))) setFormOpen(false);
  };

  const remove = async (item: ItineraryItem) => {
    if (await confirm({ title: 'Excluir registro?', message: `“${itineraryTitle(item)}” será removido do itinerário.` })) {
      await update((t) => ({ ...t, itinerary: removeById(t.itinerary, item.id) }));
    }
  };

  const addButton = (
    <button className="btn btn--primary" onClick={() => openForm(null)}>
      <Plus size={16} /> Adicionar
    </button>
  );

  return (
    <>
      <TabHeader title="Itinerário" subtitle="Passagens, deslocamentos e hospedagens em ordem cronológica." action={trip.itinerary.length > 0 && addButton} />

      {trip.itinerary.length === 0 ? (
        <EmptyState
          icon={<Route size={24} />}
          title="Nenhuma reserva ainda"
          text="Adicione voos, trens, ônibus e hospedagens com horários, endereços e localizadores."
          action={addButton}
        />
      ) : (
        <div className="timeline">
          {groups.map(([date, items]) => (
            <section key={date || 'sem-data'} className="timeline__group">
              <h3 className="timeline__date">{date ? formatWeekday(date) : 'Sem data definida'}</h3>
              <div className="stack">
                {items.map((item) => (
                  <ItineraryCard key={item.id} item={item} onEdit={() => openForm(item)} onDelete={() => void remove(item)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ExportPdfButton trip={trip} section="itinerary" />

      <ItineraryFormModal
        open={formOpen}
        initial={editing}
        defaultDate={trip.startDate}
        cities={tripCities(trip)}
        onClose={() => setFormOpen(false)}
        onSubmit={(item) => void save(item)}
      />
    </>
  );
}

function ItineraryCard({ item, onEdit, onDelete }: { item: ItineraryItem; onEdit(): void; onDelete(): void }) {
  const Icon = ITINERARY_ICONS[item.type];
  const meta = ITINERARY_TYPES[item.type];
  const isLodging = item.type === 'lodging';
  const showRoute = meta.isTransport && item.title && (item.origin || item.destination);

  const when = (date: string, time: string) => [date && formatDate(date, false), time].filter(Boolean).join(', ');
  const start = when(item.startDate, item.startTime);
  const end = when(item.endDate, item.endTime);

  return (
    <article className="item-card">
      <div className={`item-card__icon item-card__icon--${isLodging ? 'lodging' : meta.isTransport ? 'transport' : 'other'}`}>
        <Icon size={18} />
      </div>
      <div className="item-card__main">
        <div className="item-card__head">
          <div>
            <h4 className="item-card__title">{itineraryTitle(item)}</h4>
            <p className="item-card__sub">
              {[meta.label, item.provider, !meta.isTransport && item.destination].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Menu
            actions={[
              { label: 'Editar', icon: <Pencil size={15} />, onSelect: onEdit },
              { label: 'Excluir', icon: <Trash2 size={15} />, onSelect: onDelete, danger: true },
            ]}
          />
        </div>

        {showRoute && (
          <p className="route">
            {item.origin || '—'} <ArrowRight size={14} /> {item.destination || '—'}
          </p>
        )}

        {(start || end) && (
          <div className="time-pair">
            {start && (
              <div>
                <span className="time-pair__label">{isLodging ? 'Check-in' : meta.isTransport ? 'Partida' : 'Início'}</span>
                <span className="time-pair__value">{start}</span>
              </div>
            )}
            {end && (
              <div>
                <span className="time-pair__label">{isLodging ? 'Check-out' : meta.isTransport ? 'Chegada' : 'Fim'}</span>
                <span className="time-pair__value">{end}</span>
              </div>
            )}
          </div>
        )}

        {(item.confirmationCode || item.address || item.link) && (
          <div className="item-card__details">
            <CopyCode code={item.confirmationCode} />
            <AddressLink address={item.address} />
            <ExternalAnchor href={item.link} />
          </div>
        )}
        {item.notes && <p className="item-card__notes">{item.notes}</p>}
      </div>
    </article>
  );
}
