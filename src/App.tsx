import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ConfirmProvider } from './components/Confirm';
import { ToastProvider } from './components/Toast';
import { BackupControls } from './features/backup/BackupControls';
import { TripPage } from './features/trip/TripPage';
import { TripsPage } from './features/trips/TripsPage';
import { TripsProvider } from './state/TripsContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  const tripRoot = pathname.split('/').slice(0, 3).join('/');
  // Rola ao topo ao trocar de página, mas não ao trocar de aba dentro da mesma viagem.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tripRoot]);
  return null;
}

export function App() {
  return (
    // HashRouter: funciona em qualquer hospedagem estática sem configurar o servidor.
    <HashRouter>
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
              <span>TravelDesk · dados salvos neste navegador</span>
              <BackupControls />
            </footer>
          </TripsProvider>
        </ConfirmProvider>
      </ToastProvider>
    </HashRouter>
  );
}
