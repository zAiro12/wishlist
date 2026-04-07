import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
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
