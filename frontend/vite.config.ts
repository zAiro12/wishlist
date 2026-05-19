import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [
      vue(),
      VitePWA({
        strategies: 'generateSW',
        injectRegister: null,
        registerType: 'autoUpdate',
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api/') || url.pathname.startsWith('/backend/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'wishlist-api-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
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
      sourcemap: true,
    },
  };
});
