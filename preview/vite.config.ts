import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Standalone, fully client-side build of the HavenClean marketplace.
// Everything (JS + CSS) is inlined into a single index.html via
// vite-plugin-singlefile, so it can be served from any static URL
// (e.g. raw.githack.com) with no asset-path or backend concerns.
export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
});
