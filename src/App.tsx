import { useEffect } from 'react';
import { HashRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ConfirmProvider } from './components/Confirm';
import { ToastProvider } from './components/Toast';
import { BackupControls } from './features/backup/BackupControls';
import { TripPage } from './features/trip/TripPage';
import { TripsPage } from './features/trips/TripsPage';
import { TripsProvider, useTrips } from './state/TripsContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  const tripRoot = pathname.split('/').slice(0, 3).join('/');
  // Rola ao topo ao trocar de página, mas não ao trocar de aba dentro da mesma viagem.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tripRoot]);
  return null;
}

// HashRouter: funciona em qualquer hospedagem estática sem configurar o servidor.
// Publicado no claude.ai a navegação fica em memória (a página não controla a URL).
const Router = import.meta.env.VITE_TARGET === 'artifact' ? MemoryRouter : HashRouter;

function StorageNote() {
  const { storage } = useTrips();
  if (!storage) return <span>TravelDesk</span>;
  return (
    <span>
      TravelDesk · {storage === 'account' ? 'dados salvos na sua conta Claude' : 'dados salvos neste navegador'}
    </span>
  );
}

export function App() {
  return (
    <Router>
      <ToastProvider>
        <ConfirmProvider>
          <TripsProvider>
            <ScrollToTop />
            <main className="app">
              <Routes>
                <Route path="/" element={<TripsPage />} />
                <Route path="/viagens/:tripId" element={<TripPage />} />
                <Route path="/viagens/:tripId/:tab" element={<TripPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <footer className="app-footer container">
              <StorageNote />
              <BackupControls />
            </footer>
          </TripsProvider>
        </ConfirmProvider>
      </ToastProvider>
    </Router>
  );
}
