import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Plus } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { useConfirm } from '../../components/Confirm';
import { useToast } from '../../components/Toast';
import type { Trip, TripDraft } from '../../domain/types';
import { tripPhase } from '../../lib/dates';
import { useTrips } from '../../state/TripsContext';
import { TripCard } from './TripCard';
import { TripFormModal } from './TripFormModal';

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; trip: Trip };

export function TripsPage() {
  const { trips, loading, addTrip, updateTrip, deleteTrip } = useTrips();
  const [form, setForm] = useState<FormState>({ mode: 'closed' });
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();

  const sections = useMemo(() => {
    const active: Trip[] = [];
    const undated: Trip[] = [];
    const past: Trip[] = [];
    for (const trip of trips) {
      const phase = tripPhase(trip.startDate, trip.endDate);
      if (phase === 'past') past.push(trip);
      else if (phase === 'undated') undated.push(trip);
      else active.push(trip);
    }
    active.sort((a, b) => a.startDate.localeCompare(b.startDate));
    past.sort((a, b) => b.startDate.localeCompare(a.startDate));
    undated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return [
      { title: 'Próximas viagens', trips: active },
      { title: 'Datas a definir', trips: undated },
      { title: 'Viagens anteriores', trips: past },
    ].filter((s) => s.trips.length);
  }, [trips]);

  const handleSubmit = async (draft: TripDraft) => {
    if (form.mode === 'edit') {
      const ok = await updateTrip(form.trip.id, (t) => ({ ...t, ...draft }));
      if (ok) {
        toast.show('Viagem atualizada');
        setForm({ mode: 'closed' });
      }
    } else {
      const trip = await addTrip(draft);
      if (trip) {
        setForm({ mode: 'closed' });
        navigate(`/viagens/${trip.id}`);
      }
    }
  };

  const handleDelete = async (trip: Trip) => {
    const ok = await confirm({
      title: `Excluir “${trip.name}”?`,
      message: 'Todos os registros desta viagem (itinerário, roteiro, checklist e despesas) serão apagados.',
      confirmLabel: 'Excluir viagem',
    });
    if (ok) {
      await deleteTrip(trip.id);
      toast.show('Viagem excluída');
    }
  };

  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">TravelDesk</p>
          <h1 className="page-title">Minhas viagens</h1>
        </div>
        {trips.length > 0 && (
          <button className="btn btn--primary btn--lg" onClick={() => setForm({ mode: 'create' })}>
            <Plus size={18} /> Nova viagem
          </button>
        )}
      </header>

      {!loading && trips.length === 0 && (
        <EmptyState
          icon={<Plane size={26} />}
          title="Sua próxima viagem começa aqui"
          text="Crie uma viagem para organizar passagens, hospedagens, roteiro, tarefas e gastos em um só lugar."
          action={
            <button className="btn btn--primary btn--lg" onClick={() => setForm({ mode: 'create' })}>
              <Plus size={18} /> Nova viagem
            </button>
          }
        />
      )}

      {sections.map((section) => (
        <section key={section.title} className="trip-section">
          <h2 className="section-title">
            {section.title} <span className="count">{section.trips.length}</span>
          </h2>
          <div className="trip-grid">
            {section.trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onEdit={() => setForm({ mode: 'edit', trip })}
                onDelete={() => void handleDelete(trip)}
              />
            ))}
          </div>
        </section>
      ))}

      <TripFormModal
        open={form.mode !== 'closed'}
        initial={form.mode === 'edit' ? form.trip : undefined}
        onClose={() => setForm({ mode: 'closed' })}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
