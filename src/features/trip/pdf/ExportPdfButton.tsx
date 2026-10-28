import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import type { Trip } from '../../../domain/types';
import { exportTripPdf, type PdfSection } from './exportPdf';

/** Botão "PDF" no rodapé de uma aba: exporta só os dados daquela aba. */
export function ExportPdfButton({ trip, section }: { trip: Trip; section: PdfSection }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const run = async () => {
    setBusy(true);
    try {
      await exportTripPdf(trip, section);
    } catch (error) {
      console.error(error);
      toast.show('Não foi possível gerar o PDF. Tente de novo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tab-footer">
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => void run()} disabled={busy} aria-label="Exportar esta aba em PDF">
        <FileDown size={15} /> {busy ? 'Gerando…' : 'PDF'}
      </button>
    </div>
  );
}
