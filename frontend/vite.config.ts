import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

function normalizeBaseUrl(baseUrl: string | undefined): string {
  const trimmedBaseUrl = baseUrl?.trim();
  if (!trimmedBaseUrl) return '/';

  const withLeadingSlash = trimmedBaseUrl.startsWith('/') ? trimmedBaseUrl : `/${trimmedBaseUrl}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const normalizedBaseUrl = normalizeBaseUrl(env.VITE_BASE_URL);
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
          navigateFallback: `${normalizedBaseUrl}index.html`,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    // GitHub Pages deployment: set base to your repo name (e.g. '/wishlist/')
    base: normalizedBaseUrl,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
    },
  };
});
