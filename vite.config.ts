/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Caminho relativo à raiz do projeto (resolvido pelo Vite).
const unusedJsPdfDependency = '/src/features/trip/pdf/unusedJsPdfDependency.ts';

export default defineConfig({
  plugins: [react()],
  // Caminhos relativos: o build funciona em qualquer hospedagem estática.
  base: './',
  resolve: {
    // Recursos do jsPDF para HTML/SVG que o app não usa (os PDFs são montados direto dos dados).
    alias: { html2canvas: unusedJsPdfDependency, dompurify: unusedJsPdfDependency, canvg: unusedJsPdfDependency },
  },
  test: {
    environment: 'jsdom',
  },
});
