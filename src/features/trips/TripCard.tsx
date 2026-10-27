import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Pencil, Trash2 } from 'lucide-react';
import { Menu } from '../../components/Menu';
import type { Trip } from '../../domain/types';
import { formatDateRange, relativeTripLabel, tripPhase } from '../../lib/dates';
import { coverBackground } from '../../lib/cover';

interface TripCardProps {
  trip: Trip;
  onEdit(): void;
  onDelete(): void;
}

export function TripCard({ trip, onEdit, onDelete }: TripCardProps) {
  const phase = tripPhase(trip.startDate, trip.endDate);
  return (
    <article className="trip-card">
      <Link to={`/viagens/${trip.id}`} className="trip-card__link" aria-label={`Abrir ${trip.name}`}>
        <div className="trip-card__cover" style={{ background: coverBackground(trip.id, trip.coverImage) }}>
          <span className={`badge badge--glass badge--${phase}`}>{relativeTripLabel(trip.startDate, trip.endDate)}</span>
        </div>
        <div className="trip-card__body">
          <h3 className="trip-card__title">{trip.name}</h3>
          <p className="trip-card__meta">
            <MapPin size={14} />
            <span>{trip.destinations.length ? trip.destinations.join(' · ') : 'Destino a definir'}</span>
          </p>
          <p className="trip-card__meta">
            <CalendarDays size={14} />
            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
          </p>
        </div>
      </Link>
      <div className="trip-card__menu">
        <Menu
          label={`Ações de ${trip.name}`}
          actions={[
            { label: 'Editar', icon: <Pencil size={15} />, onSelect: onEdit },
            { label: 'Excluir', icon: <Trash2 size={15} />, onSelect: onDelete, danger: true },
          ]}
        />
      </div>
    </article>
  );
}
