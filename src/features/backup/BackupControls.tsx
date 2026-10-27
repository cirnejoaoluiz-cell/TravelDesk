import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { useConfirm } from '../../components/Confirm';
import { useToast } from '../../components/Toast';
import type { Trip } from '../../domain/types';
import { todayISO } from '../../lib/dates';
import { useCapability } from '../../platform/claude';
import { useTrips } from '../../state/TripsContext';

/** Exportar/importar todos os dados em JSON — cópia de segurança enquanto os dados vivem só no navegador. */
export function BackupControls() {
  const { trips, replaceAll } = useTrips();
  const confirm = useConfirm();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = async () => {
    const json = JSON.stringify({ app: 'TravelDesk', version: 1, exportedAt: new Date().toISOString(), trips }, null, 2);
    const filename = `traveldesk-backup-${todayISO()}.json`;
    // No claude.ai o download passa pela confirmação da plataforma.
    const downloads = await useCapability('downloads');
    if (downloads) {
      try {
        await downloads.save({ filename, data: json });
      } catch (error) {
        if ((error as { code?: string }).code !== 'declined') toast.show('Não foi possível exportar o backup aqui.', 'error');
      }
      return;
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { trips?: Trip[] };
      if (!Array.isArray(parsed.trips)) throw new Error('Arquivo de backup inválido.');
      const ok = await confirm({
        title: 'Restaurar backup?',
        message: `O arquivo contém ${parsed.trips.length} viagem(ns). Os dados atuais serão substituídos.`,
        confirmLabel: 'Restaurar',
      });
      if (!ok) return;
      await replaceAll(parsed.trips);
      toast.show('Backup restaurado');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Não foi possível ler o arquivo.', 'error');
    }
  };

  return (
    <div className="backup">
      <button className="link-btn" onClick={() => void exportData()} disabled={!trips.length}>
        <Download size={14} /> Exportar backup
      </button>
      <button className="link-btn" onClick={() => fileRef.current?.click()}>
        <Upload size={14} /> Importar
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void importData(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
