/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Caminhos relativos: funciona em qualquer pasta da hospedagem (ex.: /TravelDesk/peso/).
  base: './',
});
