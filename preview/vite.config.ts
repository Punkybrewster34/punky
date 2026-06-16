import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone static build of the DreamHaus dream-house builder for GitHub Pages.
// The builder is fully client-side, so it bundles to plain HTML + JS with no server.
// `base` matches the project-pages path: https://<user>.github.io/<repo>/
export default defineConfig({
  root: __dirname,
  base: process.env.PAGES_BASE || '/punky/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
