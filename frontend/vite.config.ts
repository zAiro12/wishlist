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
  // GitHub Pages deployment: set base to your repo name
  // e.g., base: '/wishlist/'
  base: process.env.VITE_BASE_URL ?? '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
