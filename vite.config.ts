import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the app from https://<user>.github.io/PdfJoin/
  base: command === 'build' ? '/PdfJoin/' : '/',
}));
