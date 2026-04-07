import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    // GitHub Pages deployment: set base to your repo name (e.g. '/wishlist/')
    base: env.VITE_BASE_URL ?? '/',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
