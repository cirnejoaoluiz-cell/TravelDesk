import { useState } from 'react';
import { Link, NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckSquare, Map as MapIcon, MapPin, Pencil, Route, Trash2, Wallet } from 'lucide-react';
import { Menu } from '../../components/Menu';
import { useConfirm } from '../../components/Confirm';
import { useToast } from '../../components/Toast';
import type { TripDraft } from '../../domain/types';
import { daysBetween, formatDateRange, relativeTripLabel, tripPhase } from '../../lib/dates';
import { coverBackground } from '../../lib/cover';
import { useTrip, useTrips } from '../../state/TripsContext';
import { TripFormModal } from '../trips/TripFormModal';
import { ItineraryTab } from './itinerary/ItineraryTab';
import { ScheduleTab } from './schedule/ScheduleTab';
import { ChecklistTab } from './checklist/ChecklistTab';
import { FinanceTab } from './finance/FinanceTab';

const TABS = [
  { slug: 'itinerario', label: 'Itinerário', icon: Route },
  { slug: 'roteiro', label: 'Roteiro', icon: MapIcon },
  { slug: 'checklist', label: 'Checklist', icon: CheckSquare },
  { slug: 'financeiro', label: 'Financeiro', icon: Wallet },
] as const;

type TabSlug = (typeof TABS)[number]['slug'];

export function TripPage() {
  const { tripId, tab } = useParams();
  const { trip, loading, update } = useTrip(tripId);
  const { deleteTrip } = useTrips();
  const [editing, setEditing] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();

  if (loading) return null;
  if (!trip) {
    return (
      <div className="page container">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Minhas viagens
        </Link>
        <p className="muted">Viagem não encontrada. Ela pode ter sido excluída.</p>
      </div>
    );
  }

  const activeTab = TABS.find((t) => t.slug === tab)?.slug;
  if (!activeTab) return <Navigate to={`/viagens/${trip.id}/itinerario`} replace />;

  const nights = daysBetween(trip.startDate, trip.endDate);
  const doneTasks = trip.tasks.filter((t) => t.done).length;
  const counters: Record<TabSlug, string> = {
    itinerario: trip.itinerary.length ? String(trip.itinerary.length) : '',
    roteiro: trip.activities.length ? String(trip.activities.length) : '',
    checklist: trip.tasks.length ? `${doneTasks}/${trip.tasks.length}` : '',
    financeiro: trip.expenses.length ? String(trip.expenses.length) : '',
  };

  const handleEdit = async (draft: TripDraft) => {
    if (await update((t) => ({ ...t, ...draft }))) {
      setEditing(false);
      toast.show('Viagem atualizada');
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Excluir “${trip.name}”?`,
      message: 'Todos os registros desta viagem serão apagados. Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir viagem',
    });
    if (!ok) return;
    await deleteTrip(trip.id);
    toast.show('Viagem excluída');
    navigate('/');
  };

  return (
    <div className="page page--trip">
      <section
        className={`trip-hero ${trip.coverImage ? 'trip-hero--image' : ''}`}
        style={{ background: coverBackground(trip.id, trip.coverImage) }}
      >
        <div className="trip-hero__shade" />
        <div className="container trip-hero__inner">
          <div className="trip-hero__top">
            <Link to="/" className="back-link back-link--light">
              <ArrowLeft size={16} /> Minhas viagens
            </Link>
            <div className="trip-hero__actions">
              <button className="btn btn--glass btn--sm" onClick={() => setEditing(true)}>
                <Pencil size={14} /> <span className="hide-sm">Editar</span>
              </button>
              <div className="menu--light">
                <Menu
                  actions={[{ label: 'Excluir viagem', icon: <Trash2 size={15} />, onSelect: handleDelete, danger: true }]}
                />
              </div>
            </div>
          </div>
          <div className="trip-hero__content">
            <span className={`badge badge--glass badge--${tripPhase(trip.startDate, trip.endDate)}`}>
              {relativeTripLabel(trip.startDate, trip.endDate)}
            </span>
            <h1 className="trip-hero__title">{trip.name}</h1>
            <div className="trip-hero__meta">
              <span>
                <MapPin size={15} /> {trip.destinations.length ? trip.destinations.join(' · ') : 'Destino a definir'}
              </span>
              <span>
                <CalendarDays size={15} /> {formatDateRange(trip.startDate, trip.endDate)}
                {nights !== null && nights > 0 && (
                  <em>
                    {' '}
                    · {nights + 1} dias
                  </em>
                )}
              </span>
            </div>
            {trip.description && <p className="trip-hero__desc">{trip.description}</p>}
          </div>
        </div>
      </section>

      <nav className="tabs" aria-label="Seções da viagem">
        <div className="container tabs__inner">
          {TABS.map(({ slug, label, icon: Icon }) => (
            <NavLink key={slug} to={`/viagens/${trip.id}/${slug}`} replace className={({ isActive }) => `tab ${isActive ? 'tab--active' : ''}`}>
              <Icon size={16} />
              <span>{label}</span>
              {counters[slug] && <span className="tab__count">{counters[slug]}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="container tab-panel">
        {activeTab === 'itinerario' && <ItineraryTab trip={trip} update={update} />}
        {activeTab === 'roteiro' && <ScheduleTab trip={trip} update={update} />}
        {activeTab === 'checklist' && <ChecklistTab trip={trip} update={update} />}
        {activeTab === 'financeiro' && <FinanceTab trip={trip} update={update} />}
      </div>

      <TripFormModal open={editing} initial={trip} onClose={() => setEditing(false)} onSubmit={handleEdit} />
    </div>
  );
}
