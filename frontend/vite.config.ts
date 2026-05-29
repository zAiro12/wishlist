import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
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
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
          navigateFallback: `${normalizedBaseUrl}index.html`,
          importScripts: [`${normalizedBaseUrl}sw-push.js`],
          runtimeCaching: [
            {
              urlPattern: ({ url, request }: { url: URL; request: Request }) => {
                const scopeScope = (globalThis as { registration?: { scope?: string } }).registration?.scope ?? '/';
                const scopePath = new URL(scopeScope, 'https://example.com').pathname;
                return (
                  request.method === 'GET' &&
                  (url.pathname.startsWith(`${scopePath}backend/`) ||
                    url.pathname === `${scopePath}api/push/vapid-public-key`)
                );
              },
              handler: 'NetworkFirst',
              options: {
                cacheName: 'runtime-api-cache',
                networkTimeoutSeconds: 10,
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
    base: normalizedBaseUrl,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
    },
  };
});