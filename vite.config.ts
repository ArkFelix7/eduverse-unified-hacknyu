import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  assetsInclude: ['**/*.wasm'],
  worker: {
    format: 'es',
  },
});